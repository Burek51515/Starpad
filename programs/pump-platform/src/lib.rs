use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount};

mod security;
use security::*;

declare_id!("PUMPxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod pump_platform {
    use super::*;

    /// Create a new token with bonding curve
    pub fn create_token(
        ctx: Context<CreateToken>,
        name: String,
        symbol: String,
        description: String,
        image_uri: String,
        twitter: Option<String>,
        telegram: Option<String>,
        website: Option<String>,
    ) -> Result<()> {
        // Security validation
        validate_token_creation(&name, &symbol, &description, &image_uri)?;

        let token = &mut ctx.accounts.token;
        let clock = Clock::get()?;

        token.creator = ctx.accounts.creator.key();
        token.mint = ctx.accounts.mint.key();
        token.name = name;
        token.symbol = symbol;
        token.description = description;
        token.image_uri = image_uri;
        token.twitter = twitter;
        token.telegram = telegram;
        token.website = website;
        
        // Bonding curve parameters
        token.virtual_sol_reserves = 30_000_000_000; // 30 SOL virtual
        token.virtual_token_reserves = 1_073_000_000_000_000_000; // 1.073B tokens (with decimals)
        token.real_sol_reserves = 0;
        token.real_token_reserves = 0;
        
        token.total_supply = 1_000_000_000_000_000_000; // 1B tokens with 9 decimals
        token.circulating_supply = 0;
        token.bonding_curve_active = true;
        token.target_mcap = 69_000_000_000; // $69k target (in lamports equivalent)
        token.created_at = clock.unix_timestamp;
        token.graduation_time = None;
        
        // Platform fee: 1% on trades (0.5% to platform, 0.5% to creator)
        token.platform_fee_bps = 50; // 0.5%
        token.creator_fee_bps = 50; // 0.5%
        token.creator_earnings = 0;
        
        // Creator gets 2% of supply as initial allocation
        let creator_allocation = token.total_supply / 50; // 2%
        token.creator_allocation = creator_allocation;
        token.circulating_supply = creator_allocation;

        // Mint creator allocation
        let seeds = &[
            b"token".as_ref(),
            ctx.accounts.creator.key().as_ref(),
            token.symbol.as_bytes(),
            &[ctx.bumps.token],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: token.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, creator_allocation)?;

        msg!("🚀 Token created: {}", token.symbol);
        msg!("Creator allocation: {} tokens", creator_allocation);

        Ok(())
    }

    /// Post an update as token creator
    pub fn post_update(
        ctx: Context<PostUpdate>,
        content: String,
        update_type: UpdateType,
    ) -> Result<()> {
        let token = &ctx.accounts.token;
        
        // Security validation
        validate_post(&content, &ctx.accounts.creator.key(), &token.creator)?;
        
        let post = &mut ctx.accounts.post;
        let clock = Clock::get()?;

        post.token = token.key();
        post.creator = ctx.accounts.creator.key();
        post.content = content;
        post.update_type = update_type;
        post.timestamp = clock.unix_timestamp;
        post.likes = 0;

        msg!("📝 New post from creator");

        Ok(())
    }

    /// Buy tokens through bonding curve
    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        sol_amount: u64,
        min_tokens_out: u64,
    ) -> Result<()> {
        let token = &mut ctx.accounts.token;
        let clock = Clock::get()?;
        
        // Security validations
        validate_trade(sol_amount, min_tokens_out, token.bonding_curve_active, clock.unix_timestamp)?;
        require!(sol_amount >= 10_000_000, ErrorCode::AmountTooSmall); // Min 0.01 SOL

        // Calculate fees
        let platform_fee = sol_amount * token.platform_fee_bps as u64 / 10000;
        let creator_fee = sol_amount * token.creator_fee_bps as u64 / 10000;
        let total_fees = platform_fee + creator_fee;
        let sol_for_curve = sol_amount - total_fees;

        // Calculate tokens using constant product formula
        let virtual_sol = token.virtual_sol_reserves + token.real_sol_reserves;
        let virtual_tokens = token.virtual_token_reserves - token.real_token_reserves;
        
        // Check for overflow
        check_overflow(virtual_sol, virtual_tokens)?;
        
        // Check price impact (warning only)
        let _impact = check_price_impact(virtual_sol, virtual_tokens, sol_for_curve)?;
        
        let k = virtual_sol as u128 * virtual_tokens as u128;
        let new_virtual_sol = virtual_sol + sol_for_curve;
        let new_virtual_tokens = (k / new_virtual_sol as u128) as u64;
        let tokens_out = virtual_tokens - new_virtual_tokens;

        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);

        // Update reserves
        token.real_sol_reserves += sol_for_curve;
        token.real_token_reserves += tokens_out;
        token.circulating_supply += tokens_out;
        token.creator_earnings += creator_fee;

        // Transfer SOL from buyer
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.bonding_curve_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, sol_for_curve)?;

        // Transfer platform fee
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.platform_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, platform_fee)?;

        // Transfer creator fee
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.creator_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, creator_fee)?;

        // Mint tokens to buyer
        let seeds = &[
            b"token".as_ref(),
            token.creator.as_ref(),
            token.symbol.as_bytes(),
            &[ctx.bumps.token],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: token.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, tokens_out)?;

        msg!("💎 Buy executed!");
        msg!("SOL in: {}, Tokens out: {}", sol_amount, tokens_out);
        msg!("Creator earned: {} SOL in fees", creator_fee);

        // Check if graduation target reached
        if token.real_sol_reserves >= token.target_mcap {
            token.bonding_curve_active = false;
            token.graduation_time = Some(Clock::get()?.unix_timestamp);
            msg!("🎉 BONDING CURVE GRADUATED! READY FOR DEX!");
        }

        Ok(())
    }

    /// Sell tokens through bonding curve
    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        token_amount: u64,
        min_sol_out: u64,
    ) -> Result<()> {
        let token = &mut ctx.accounts.token;
        
        require!(token.bonding_curve_active, ErrorCode::BondingCurveInactive);

        // Calculate SOL to receive
        let virtual_sol = token.virtual_sol_reserves + token.real_sol_reserves;
        let virtual_tokens = token.virtual_token_reserves - token.real_token_reserves;
        
        let k = virtual_sol as u128 * virtual_tokens as u128;
        let new_virtual_tokens = virtual_tokens + token_amount;
        let new_virtual_sol = (k / new_virtual_tokens as u128) as u64;
        let sol_out_gross = virtual_sol - new_virtual_sol;

        // Calculate fees
        let platform_fee = sol_out_gross * token.platform_fee_bps as u64 / 10000;
        let creator_fee = sol_out_gross * token.creator_fee_bps as u64 / 10000;
        let total_fees = platform_fee + creator_fee;
        let sol_out_net = sol_out_gross - total_fees;

        require!(sol_out_net >= min_sol_out, ErrorCode::SlippageExceeded);

        // Update reserves
        token.real_sol_reserves -= sol_out_gross;
        token.real_token_reserves -= token_amount;
        token.circulating_supply -= token_amount;
        token.creator_earnings += creator_fee;

        // Burn tokens from seller
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::burn(cpi_ctx, token_amount)?;

        // Transfer SOL to seller (from bonding curve vault)
        let seeds = &[
            b"bonding_curve_vault".as_ref(),
            token.key().as_ref(),
            &[ctx.bumps.bonding_curve_vault],
        ];
        let signer = &[&seeds[..]];

        **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? -= sol_out_net;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_out_net;

        // Transfer fees
        **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? -= platform_fee;
        **ctx.accounts.platform_vault.to_account_info().try_borrow_mut_lamports()? += platform_fee;

        **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? -= creator_fee;
        **ctx.accounts.creator_vault.to_account_info().try_borrow_mut_lamports()? += creator_fee;

        msg!("📉 Sell executed!");
        msg!("Tokens in: {}, SOL out: {}", token_amount, sol_out_net);

        Ok(())
    }

    /// Withdraw creator earnings
    pub fn withdraw_earnings(ctx: Context<WithdrawEarnings>) -> Result<()> {
        let token = &ctx.accounts.token;
        
        require!(ctx.accounts.creator.key() == token.creator, ErrorCode::NotCreator);
        require!(token.creator_earnings > 0, ErrorCode::NoEarnings);

        let amount = token.creator_earnings;

        // Transfer from creator vault to creator
        let seeds = &[
            b"creator_vault".as_ref(),
            token.key().as_ref(),
            &[ctx.bumps.creator_vault],
        ];
        let signer = &[&seeds[..]];

        **ctx.accounts.creator_vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.creator.to_account_info().try_borrow_mut_lamports()? += amount;

        // Update token state
        let token = &mut ctx.accounts.token;
        token.creator_earnings = 0;

        msg!("💰 Creator withdrew {} SOL in earnings", amount);

        Ok(())
    }

    /// Like a post
    pub fn like_post(ctx: Context<LikePost>) -> Result<()> {
        let post = &mut ctx.accounts.post;
        post.likes += 1;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(name: String, symbol: String)]
pub struct CreateToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        mint::decimals = 9,
        mint::authority = token,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = creator,
        space = 8 + TokenData::LEN,
        seeds = [b"token", creator.key().as_ref(), symbol.as_bytes()],
        bump
    )]
    pub token: Account<'info, TokenData>,

    #[account(
        init,
        payer = creator,
        space = 8,
        seeds = [b"bonding_curve_vault", token.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault for SOL
    pub bonding_curve_vault: AccountInfo<'info>,

    #[account(
        init,
        payer = creator,
        space = 8,
        seeds = [b"creator_vault", token.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault for creator earnings
    pub creator_vault: AccountInfo<'info>,

    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = creator,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// CHECK: Platform fee vault
    #[account(mut)]
    pub platform_vault: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct PostUpdate<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    pub token: Account<'info, TokenData>,

    #[account(
        init,
        payer = creator,
        space = 8 + Post::LEN,
        seeds = [b"post", token.key().as_ref(), &Clock::get()?.unix_timestamp.to_le_bytes()],
        bump
    )]
    pub post: Account<'info, Post>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"token", token.creator.as_ref(), token.symbol.as_bytes()],
        bump
    )]
    pub token: Account<'info, TokenData>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"bonding_curve_vault", token.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault
    pub bonding_curve_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"creator_vault", token.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault
    pub creator_vault: AccountInfo<'info>,

    /// CHECK: Platform vault
    #[account(mut)]
    pub platform_vault: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, anchor_spl::associated_token::AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"token", token.creator.as_ref(), token.symbol.as_bytes()],
        bump
    )]
    pub token: Account<'info, TokenData>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = seller,
    )]
    pub seller_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"bonding_curve_vault", token.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault
    pub bonding_curve_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"creator_vault", token.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault
    pub creator_vault: AccountInfo<'info>,

    /// CHECK: Platform vault
    #[account(mut)]
    pub platform_vault: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawEarnings<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(mut)]
    pub token: Account<'info, TokenData>,

    #[account(
        mut,
        seeds = [b"creator_vault", token.key().as_ref()],
        bump
    )]
    /// CHECK: PDA vault
    pub creator_vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LikePost<'info> {
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub post: Account<'info, Post>,
}

#[account]
pub struct TokenData {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub description: String,
    pub image_uri: String,
    pub twitter: Option<String>,
    pub telegram: Option<String>,
    pub website: Option<String>,
    
    // Bonding curve data
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub total_supply: u64,
    pub circulating_supply: u64,
    pub bonding_curve_active: bool,
    pub target_mcap: u64,
    pub created_at: i64,
    pub graduation_time: Option<i64>,
    
    // Fee structure
    pub platform_fee_bps: u16,
    pub creator_fee_bps: u16,
    pub creator_earnings: u64,
    pub creator_allocation: u64,
}

impl TokenData {
    pub const LEN: usize = 
        32 + // creator
        32 + // mint
        (4 + 32) + // name
        (4 + 10) + // symbol
        (4 + 500) + // description
        (4 + 200) + // image_uri
        (1 + 4 + 100) + // twitter
        (1 + 4 + 100) + // telegram
        (1 + 4 + 200) + // website
        8 + 8 + 8 + 8 + // reserves
        8 + 8 + // supply
        1 + 8 + // bonding curve active + target
        8 + // created_at
        (1 + 8) + // graduation_time
        2 + 2 + 8 + 8; // fees
}

#[account]
pub struct Post {
    pub token: Pubkey,
    pub creator: Pubkey,
    pub content: String,
    pub update_type: UpdateType,
    pub timestamp: i64,
    pub likes: u32,
}

impl Post {
    pub const LEN: usize = 32 + 32 + (4 + 500) + 1 + 8 + 4;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum UpdateType {
    General,
    Announcement,
    Milestone,
    Marketing,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Name too long (max 32 characters)")]
    NameTooLong,
    #[msg("Symbol too long (max 10 characters)")]
    SymbolTooLong,
    #[msg("Description too long (max 500 characters)")]
    DescriptionTooLong,
    #[msg("Content too long (max 500 characters)")]
    ContentTooLong,
    #[msg("Bonding curve is no longer active")]
    BondingCurveInactive,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Amount too small (minimum 0.01 SOL)")]
    AmountTooSmall,
    #[msg("Only creator can perform this action")]
    NotCreator,
    #[msg("No earnings to withdraw")]
    NoEarnings,
}
