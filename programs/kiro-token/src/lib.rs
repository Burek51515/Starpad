use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};

declare_id!("KIROxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

#[program]
pub mod kiro_token {
    use super::*;

    /// Initialize the KIRO token with bonding curve parameters
    pub fn initialize(
        ctx: Context<Initialize>,
        total_supply: u64,
        decimals: u8,
        symbol: String,
        name: String,
        uri: String,
    ) -> Result<()> {
        let token_config = &mut ctx.accounts.token_config;
        token_config.authority = ctx.accounts.authority.key();
        token_config.mint = ctx.accounts.mint.key();
        token_config.total_supply = total_supply;
        token_config.circulating_supply = 0;
        token_config.decimals = decimals;
        token_config.symbol = symbol;
        token_config.name = name;
        token_config.uri = uri;
        token_config.bonding_curve_active = true;
        token_config.market_cap_target = 69_000_000_000; // $69k target like pump.fun
        token_config.initial_virtual_sol_reserves = 30_000_000_000; // 30 SOL virtual
        token_config.initial_virtual_token_reserves = 1_073_000_000_000_000; // ~1.073B tokens

        msg!("KIRO Token initialized! 🚀");
        msg!("Total Supply: {}", total_supply);
        msg!("Symbol: {}", symbol);
        msg!("Let's go to the moon! 🌕");

        Ok(())
    }

    /// Buy KIRO tokens through bonding curve
    pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64, min_tokens_out: u64) -> Result<()> {
        let token_config = &mut ctx.accounts.token_config;
        
        require!(token_config.bonding_curve_active, ErrorCode::BondingCurveInactive);

        // Calculate tokens to receive based on bonding curve formula
        // Using constant product formula: x * y = k
        let virtual_sol = token_config.initial_virtual_sol_reserves;
        let virtual_tokens = token_config.initial_virtual_token_reserves;
        
        let k = virtual_sol * virtual_tokens;
        let new_virtual_sol = virtual_sol + sol_amount;
        let new_virtual_tokens = k / new_virtual_sol;
        let tokens_out = virtual_tokens - new_virtual_tokens;

        require!(tokens_out >= min_tokens_out, ErrorCode::SlippageExceeded);

        // Update virtual reserves
        token_config.initial_virtual_sol_reserves = new_virtual_sol;
        token_config.initial_virtual_token_reserves = new_virtual_tokens;
        token_config.circulating_supply += tokens_out;

        // Transfer SOL from buyer to program
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.bonding_curve_vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, sol_amount)?;

        // Mint tokens to buyer
        let seeds = &[
            b"token_config".as_ref(),
            &[ctx.bumps.token_config],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: token_config.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, tokens_out)?;

        msg!("Tokens purchased! 💎");
        msg!("SOL in: {}", sol_amount);
        msg!("KIRO out: {}", tokens_out);

        // Check if market cap target reached
        if token_config.initial_virtual_sol_reserves >= token_config.market_cap_target {
            token_config.bonding_curve_active = false;
            msg!("🎉 BONDING CURVE COMPLETE! MIGRATING TO RAYDIUM! 🎉");
        }

        Ok(())
    }

    /// Sell KIRO tokens through bonding curve
    pub fn sell_tokens(ctx: Context<SellTokens>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        let token_config = &mut ctx.accounts.token_config;
        
        require!(token_config.bonding_curve_active, ErrorCode::BondingCurveInactive);

        // Calculate SOL to receive
        let virtual_sol = token_config.initial_virtual_sol_reserves;
        let virtual_tokens = token_config.initial_virtual_token_reserves;
        
        let k = virtual_sol * virtual_tokens;
        let new_virtual_tokens = virtual_tokens + token_amount;
        let new_virtual_sol = k / new_virtual_tokens;
        let sol_out = virtual_sol - new_virtual_sol;

        require!(sol_out >= min_sol_out, ErrorCode::SlippageExceeded);

        // Update virtual reserves
        token_config.initial_virtual_sol_reserves = new_virtual_sol;
        token_config.initial_virtual_token_reserves = new_virtual_tokens;
        token_config.circulating_supply -= token_amount;

        // Burn tokens from seller
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.seller_token_account.to_account_info(),
            authority: ctx.accounts.seller.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::burn(cpi_ctx, token_amount)?;

        // Transfer SOL to seller
        let seeds = &[
            b"bonding_curve_vault".as_ref(),
            &[ctx.bumps.bonding_curve_vault],
        ];
        let signer = &[&seeds[..]];

        **ctx.accounts.bonding_curve_vault.to_account_info().try_borrow_mut_lamports()? -= sol_out;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += sol_out;

        msg!("Tokens sold! 📉");
        msg!("KIRO in: {}", token_amount);
        msg!("SOL out: {}", sol_out);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 9,
        mint::authority = token_config,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + TokenConfig::LEN,
        seeds = [b"token_config"],
        bump
    )]
    pub token_config: Account<'info, TokenConfig>,

    #[account(
        init,
        payer = authority,
        space = 8,
        seeds = [b"bonding_curve_vault"],
        bump
    )]
    /// CHECK: This is a PDA vault for holding SOL
    pub bonding_curve_vault: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"token_config"],
        bump
    )]
    pub token_config: Account<'info, TokenConfig>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = buyer,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"bonding_curve_vault"],
        bump
    )]
    /// CHECK: This is a PDA vault for holding SOL
    pub bonding_curve_vault: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellTokens<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,

    #[account(
        mut,
        seeds = [b"token_config"],
        bump
    )]
    pub token_config: Account<'info, TokenConfig>,

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
        seeds = [b"bonding_curve_vault"],
        bump
    )]
    /// CHECK: This is a PDA vault for holding SOL
    pub bonding_curve_vault: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct TokenConfig {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub total_supply: u64,
    pub circulating_supply: u64,
    pub decimals: u8,
    pub symbol: String,
    pub name: String,
    pub uri: String,
    pub bonding_curve_active: bool,
    pub market_cap_target: u64,
    pub initial_virtual_sol_reserves: u64,
    pub initial_virtual_token_reserves: u64,
}

impl TokenConfig {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1 + (4 + 10) + (4 + 50) + (4 + 200) + 1 + 8 + 8 + 8;
}

#[error_code]
pub enum ErrorCode {
    #[msg("Bonding curve is no longer active")]
    BondingCurveInactive,
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
}
