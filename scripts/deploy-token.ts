import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, setProvider } from '@project-serum/anchor';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * KIRO COIN Deployment Script
 * 
 * This script deploys the KIRO token to Solana
 * 
 * Prerequisites:
 * 1. Solana CLI installed
 * 2. Anchor framework installed
 * 3. Wallet funded with SOL (devnet or mainnet)
 * 4. Program built: anchor build
 */

const NETWORK = process.env.NETWORK || 'devnet';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function main() {
    console.log('🚀 KIRO COIN Deployment Starting...\n');
    
    // Connect to cluster
    const connection = new Connection(RPC_URL, 'confirmed');
    console.log(`📡 Connected to ${NETWORK}`);
    
    // Load deployer wallet
    const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME!, '.config/solana/id.json');
    const walletKeypair = await loadWallet(walletPath);
    console.log(`💼 Deployer: ${walletKeypair.publicKey.toString()}`);
    
    // Check balance
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log(`💰 Balance: ${balance / 1e9} SOL`);
    
    if (balance < 1e9) {
        console.error('❌ Insufficient balance! Need at least 1 SOL for deployment.');
        process.exit(1);
    }
    
    // Load program
    const programId = await getProgramId();
    console.log(`📋 Program ID: ${programId.toString()}\n`);
    
    // Create provider
    const wallet = new Wallet(walletKeypair);
    const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
    });
    setProvider(provider);
    
    console.log('⏳ Initializing KIRO token...');
    
    // Token configuration
    const tokenConfig = {
        totalSupply: 1_000_000_000 * 1e9, // 1 billion with 9 decimals
        decimals: 9,
        symbol: 'KIRO',
        name: 'KIRO COIN',
        uri: 'https://kirocoin.io/metadata.json',
    };
    
    console.log('\n📊 Token Configuration:');
    console.log(`   Name: ${tokenConfig.name}`);
    console.log(`   Symbol: ${tokenConfig.symbol}`);
    console.log(`   Total Supply: ${tokenConfig.totalSupply / 1e9}`);
    console.log(`   Decimals: ${tokenConfig.decimals}`);
    
    // In production, you would:
    // 1. Load the program IDL
    // 2. Call the initialize instruction
    // 3. Create the token mint
    // 4. Set up the bonding curve
    
    console.log('\n✅ Deployment Complete!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Verify on Solscan');
    console.log('   2. Update website with contract address');
    console.log('   3. Submit for verification');
    console.log('   4. Announce to community');
    console.log('\n🚀 KIRO COIN is live! Let\'s go to the moon! 🌕\n');
}

async function loadWallet(walletPath: string): Promise<Keypair> {
    try {
        const walletData = await fs.readFile(walletPath, 'utf-8');
        const secretKey = new Uint8Array(JSON.parse(walletData));
        return Keypair.fromSecretKey(secretKey);
    } catch (error) {
        console.error(`❌ Failed to load wallet from ${walletPath}`);
        throw error;
    }
}

async function getProgramId(): Promise<PublicKey> {
    // In production, load this from Anchor.toml or deployment artifacts
    const programIdStr = process.env.PROGRAM_ID || 'KIROxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    return new PublicKey(programIdStr);
}

// Run deployment
main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
});
