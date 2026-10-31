// Real Smart Contract Interface
import { Program, AnchorProvider, web3, BN, Idl } from '@project-serum/anchor';
import { 
    PublicKey, 
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    Transaction
} from '@solana/web3.js';
import { 
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress
} from '@solana/spl-token';
import { walletManager } from './wallet-adapter';
import PumpPlatformIDL from '../target/idl/pump_platform.json';

export interface TokenData {
    creator: PublicKey;
    mint: PublicKey;
    name: string;
    symbol: string;
    description: string;
    imageUri: string;
    twitter?: string;
    telegram?: string;
    website?: string;
    virtualSolReserves: BN;
    virtualTokenReserves: BN;
    realSolReserves: BN;
    realTokenReserves: BN;
    totalSupply: BN;
    circulatingSupply: BN;
    bondingCurveActive: boolean;
    targetMcap: BN;
    createdAt: BN;
    platformFeeBps: number;
    creatorFeeBps: number;
    creatorEarnings: BN;
}

export class PumpPlatformClient {
    private program: Program;
    private programId: PublicKey;
    
    constructor(provider: AnchorProvider) {
        this.programId = new PublicKey(PumpPlatformIDL.metadata.address);
        this.program = new Program(
            PumpPlatformIDL as Idl,
            this.programId,
            provider
        );
    }

    // Create a new token
    async createToken(params: {
        name: string;
        symbol: string;
        description: string;
        imageUri: string;
        twitter?: string;
        telegram?: string;
        website?: string;
    }): Promise<{ signature: string; mint: PublicKey; token: PublicKey }> {
        
        if (!walletManager.publicKey) {
            throw new Error('Wallet not connected');
        }

        // Generate mint keypair
        const mint = web3.Keypair.generate();
        
        // Derive PDAs
        const [token] = await PublicKey.findProgramAddress(
            [
                Buffer.from('token'),
                walletManager.publicKey.toBuffer(),
                Buffer.from(params.symbol)
            ],
            this.programId
        );

        const [bondingCurveVault] = await PublicKey.findProgramAddress(
            [Buffer.from('bonding_curve_vault'), token.toBuffer()],
            this.programId
        );

        const [creatorVault] = await PublicKey.findProgramAddress(
            [Buffer.from('creator_vault'), token.toBuffer()],
            this.programId
        );

        // Get creator's associated token account
        const creatorTokenAccount = await getAssociatedTokenAddress(
            mint.publicKey,
            walletManager.publicKey
        );

        // Platform vault (hardcoded for now, should be from config)
        const platformVault = new PublicKey('PLATFORM_VAULT_ADDRESS_HERE');

        console.log('Creating token with params:', params);

        const tx = await this.program.methods
            .createToken(
                params.name,
                params.symbol,
                params.description,
                params.imageUri,
                params.twitter || null,
                params.telegram || null,
                params.website || null
            )
            .accounts({
                creator: walletManager.publicKey,
                mint: mint.publicKey,
                token: token,
                bondingCurveVault: bondingCurveVault,
                creatorVault: creatorVault,
                creatorTokenAccount: creatorTokenAccount,
                platformVault: platformVault,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([mint])
            .rpc();

        console.log('Token created! Signature:', tx);

        return {
            signature: tx,
            mint: mint.publicKey,
            token: token
        };
    }

    // Buy tokens
    async buyTokens(
        tokenPda: PublicKey,
        solAmount: number,
        minTokensOut: number
    ): Promise<string> {
        
        if (!walletManager.publicKey) {
            throw new Error('Wallet not connected');
        }

        const tokenData = await this.getTokenData(tokenPda);
        
        const [bondingCurveVault] = await PublicKey.findProgramAddress(
            [Buffer.from('bonding_curve_vault'), tokenPda.toBuffer()],
            this.programId
        );

        const [creatorVault] = await PublicKey.findProgramAddress(
            [Buffer.from('creator_vault'), tokenPda.toBuffer()],
            this.programId
        );

        const buyerTokenAccount = await getAssociatedTokenAddress(
            tokenData.mint,
            walletManager.publicKey
        );

        const platformVault = new PublicKey('PLATFORM_VAULT_ADDRESS_HERE');

        const solAmountLamports = new BN(solAmount * web3.LAMPORTS_PER_SOL);
        const minTokensOutBN = new BN(minTokensOut * 1e9); // 9 decimals

        const tx = await this.program.methods
            .buyTokens(solAmountLamports, minTokensOutBN)
            .accounts({
                buyer: walletManager.publicKey,
                token: tokenPda,
                mint: tokenData.mint,
                buyerTokenAccount: buyerTokenAccount,
                bondingCurveVault: bondingCurveVault,
                creatorVault: creatorVault,
                platformVault: platformVault,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log('Tokens purchased! Signature:', tx);
        return tx;
    }

    // Sell tokens
    async sellTokens(
        tokenPda: PublicKey,
        tokenAmount: number,
        minSolOut: number
    ): Promise<string> {
        
        if (!walletManager.publicKey) {
            throw new Error('Wallet not connected');
        }

        const tokenData = await this.getTokenData(tokenPda);
        
        const [bondingCurveVault] = await PublicKey.findProgramAddress(
            [Buffer.from('bonding_curve_vault'), tokenPda.toBuffer()],
            this.programId
        );

        const [creatorVault] = await PublicKey.findProgramAddress(
            [Buffer.from('creator_vault'), tokenPda.toBuffer()],
            this.programId
        );

        const sellerTokenAccount = await getAssociatedTokenAddress(
            tokenData.mint,
            walletManager.publicKey
        );

        const platformVault = new PublicKey('PLATFORM_VAULT_ADDRESS_HERE');

        const tokenAmountBN = new BN(tokenAmount * 1e9);
        const minSolOutLamports = new BN(minSolOut * web3.LAMPORTS_PER_SOL);

        const tx = await this.program.methods
            .sellTokens(tokenAmountBN, minSolOutLamports)
            .accounts({
                seller: walletManager.publicKey,
                token: tokenPda,
                mint: tokenData.mint,
                sellerTokenAccount: sellerTokenAccount,
                bondingCurveVault: bondingCurveVault,
                creatorVault: creatorVault,
                platformVault: platformVault,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log('Tokens sold! Signature:', tx);
        return tx;
    }

    // Post update as creator
    async postUpdate(
        tokenPda: PublicKey,
        content: string,
        updateType: 'general' | 'announcement' | 'milestone' | 'marketing'
    ): Promise<string> {
        
        if (!walletManager.publicKey) {
            throw new Error('Wallet not connected');
        }

        const timestamp = Math.floor(Date.now() / 1000);
        
        const [post] = await PublicKey.findProgramAddress(
            [
                Buffer.from('post'),
                tokenPda.toBuffer(),
                Buffer.from(timestamp.toString())
            ],
            this.programId
        );

        const updateTypeEnum = {
            general: { general: {} },
            announcement: { announcement: {} },
            milestone: { milestone: {} },
            marketing: { marketing: {} }
        }[updateType];

        const tx = await this.program.methods
            .postUpdate(content, updateTypeEnum)
            .accounts({
                creator: walletManager.publicKey,
                token: tokenPda,
                post: post,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log('Update posted! Signature:', tx);
        return tx;
    }

    // Withdraw creator earnings
    async withdrawEarnings(tokenPda: PublicKey): Promise<string> {
        
        if (!walletManager.publicKey) {
            throw new Error('Wallet not connected');
        }

        const [creatorVault] = await PublicKey.findProgramAddress(
            [Buffer.from('creator_vault'), tokenPda.toBuffer()],
            this.programId
        );

        const tx = await this.program.methods
            .withdrawEarnings()
            .accounts({
                creator: walletManager.publicKey,
                token: tokenPda,
                creatorVault: creatorVault,
                systemProgram: SystemProgram.programId,
            })
            .rpc();

        console.log('Earnings withdrawn! Signature:', tx);
        return tx;
    }

    // Get token data
    async getTokenData(tokenPda: PublicKey): Promise<TokenData> {
        const account = await this.program.account.tokenData.fetch(tokenPda);
        return account as unknown as TokenData;
    }

    // Get all tokens
    async getAllTokens(): Promise<Array<{ publicKey: PublicKey; account: TokenData }>> {
        const accounts = await this.program.account.tokenData.all();
        return accounts.map(acc => ({
            publicKey: acc.publicKey,
            account: acc.account as unknown as TokenData
        }));
    }

    // Calculate buy price
    calculateBuyPrice(tokenData: TokenData, solAmount: number): {
        tokensOut: number;
        priceImpact: number;
        platformFee: number;
        creatorFee: number;
    } {
        const solAmountLamports = solAmount * web3.LAMPORTS_PER_SOL;
        
        // Fees
        const platformFee = solAmountLamports * (tokenData.platformFeeBps / 10000);
        const creatorFee = solAmountLamports * (tokenData.creatorFeeBps / 10000);
        const totalFees = platformFee + creatorFee;
        const solForCurve = solAmountLamports - totalFees;

        // Bonding curve calculation
        const virtualSol = tokenData.virtualSolReserves.toNumber() + tokenData.realSolReserves.toNumber();
        const virtualTokens = tokenData.virtualTokenReserves.toNumber() - tokenData.realTokenReserves.toNumber();
        
        const k = virtualSol * virtualTokens;
        const newVirtualSol = virtualSol + solForCurve;
        const newVirtualTokens = k / newVirtualSol;
        const tokensOut = (virtualTokens - newVirtualTokens) / 1e9; // Convert from lamports

        const priceImpact = (solForCurve / virtualSol) * 100;

        return {
            tokensOut,
            priceImpact,
            platformFee: platformFee / web3.LAMPORTS_PER_SOL,
            creatorFee: creatorFee / web3.LAMPORTS_PER_SOL
        };
    }

    // Calculate sell price
    calculateSellPrice(tokenData: TokenData, tokenAmount: number): {
        solOut: number;
        priceImpact: number;
        totalFees: number;
    } {
        const tokenAmountLamports = tokenAmount * 1e9;
        
        const virtualSol = tokenData.virtualSolReserves.toNumber() + tokenData.realSolReserves.toNumber();
        const virtualTokens = tokenData.virtualTokenReserves.toNumber() - tokenData.realTokenReserves.toNumber();
        
        const k = virtualSol * virtualTokens;
        const newVirtualTokens = virtualTokens + tokenAmountLamports;
        const newVirtualSol = k / newVirtualTokens;
        const solOutGross = virtualSol - newVirtualSol;

        const platformFee = solOutGross * (tokenData.platformFeeBps / 10000);
        const creatorFee = solOutGross * (tokenData.creatorFeeBps / 10000);
        const totalFees = platformFee + creatorFee;
        const solOutNet = (solOutGross - totalFees) / web3.LAMPORTS_PER_SOL;

        const priceImpact = (tokenAmountLamports / virtualTokens) * 100;

        return {
            solOut: solOutNet,
            priceImpact,
            totalFees: totalFees / web3.LAMPORTS_PER_SOL
        };
    }
}

// Helper to initialize client
export function getProgramClient(): PumpPlatformClient {
    const provider = walletManager.getProvider();
    return new PumpPlatformClient(provider);
}
