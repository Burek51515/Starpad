// Real Solana Wallet Integration
import { 
    Connection, 
    PublicKey, 
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import { 
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

// Wallet Adapter imports
declare global {
    interface Window {
        solana?: any;
        solflare?: any;
        backpack?: any;
    }
}

export class WalletManager {
    public connection: Connection;
    public wallet: any = null;
    public publicKey: PublicKey | null = null;
    private provider: AnchorProvider | null = null;
    
    constructor(rpcUrl: string = 'https://api.devnet.solana.com') {
        this.connection = new Connection(rpcUrl, 'confirmed');
    }

    async connect(walletType: 'phantom' | 'solflare' | 'backpack' = 'phantom'): Promise<boolean> {
        try {
            let walletAdapter;
            
            switch(walletType) {
                case 'phantom':
                    if (!window.solana?.isPhantom) {
                        window.open('https://phantom.app/', '_blank');
                        throw new Error('Phantom wallet not installed');
                    }
                    walletAdapter = window.solana;
                    break;
                    
                case 'solflare':
                    if (!window.solflare) {
                        window.open('https://solflare.com/', '_blank');
                        throw new Error('Solflare wallet not installed');
                    }
                    walletAdapter = window.solflare;
                    break;
                    
                case 'backpack':
                    if (!window.backpack) {
                        window.open('https://backpack.app/', '_blank');
                        throw new Error('Backpack wallet not installed');
                    }
                    walletAdapter = window.backpack;
                    break;
            }

            const resp = await walletAdapter.connect();
            this.wallet = walletAdapter;
            this.publicKey = new PublicKey(resp.publicKey.toString());
            
            console.log('✅ Wallet connected:', this.publicKey.toString());
            
            // Setup provider for Anchor
            this.provider = new AnchorProvider(
                this.connection,
                walletAdapter,
                { commitment: 'confirmed' }
            );
            
            return true;
        } catch (error) {
            console.error('Wallet connection failed:', error);
            return false;
        }
    }

    async disconnect() {
        if (this.wallet) {
            await this.wallet.disconnect();
            this.wallet = null;
            this.publicKey = null;
            this.provider = null;
            console.log('Wallet disconnected');
        }
    }

    async getBalance(): Promise<number> {
        if (!this.publicKey) return 0;
        const balance = await this.connection.getBalance(this.publicKey);
        return balance / LAMPORTS_PER_SOL;
    }

    async signAndSendTransaction(transaction: Transaction): Promise<string> {
        if (!this.wallet || !this.publicKey) {
            throw new Error('Wallet not connected');
        }

        transaction.recentBlockhash = (
            await this.connection.getLatestBlockhash()
        ).blockhash;
        transaction.feePayer = this.publicKey;

        const signed = await this.wallet.signTransaction(transaction);
        const signature = await this.connection.sendRawTransaction(signed.serialize());
        await this.connection.confirmTransaction(signature);
        
        return signature;
    }

    getProvider(): AnchorProvider {
        if (!this.provider) {
            throw new Error('Provider not initialized. Connect wallet first.');
        }
        return this.provider;
    }
}

// Export singleton instance
export const walletManager = new WalletManager(
    process.env.RPC_URL || 'https://api.devnet.solana.com'
);
