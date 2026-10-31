# 🚀 KIRO COIN Deployment Guide

## Prerequisites

### 1. Install Tools

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Install Node dependencies
npm install
```

### 2. Create Solana Wallet

```bash
# Generate new keypair
solana-keygen new --outfile ~/.config/solana/id.json

# Check your address
solana address

# Get devnet SOL for testing
solana airdrop 2 --url devnet
```

### 3. Configure Anchor

```bash
# Set cluster to devnet (for testing)
solana config set --url devnet

# Or mainnet (for production)
solana config set --url mainnet-beta
```

## Build the Program

```bash
# Build the Solana program
anchor build

# This generates:
# - target/deploy/kiro_token.so (the program binary)
# - target/idl/kiro_token.json (the Interface Definition Language file)
```

## Deploy to Devnet (Testing)

### 1. Deploy Program

```bash
# Deploy the program
anchor deploy --provider.cluster devnet

# Note the Program ID that's displayed
# Update it in:
# - Anchor.toml
# - programs/kiro-token/src/lib.rs (declare_id! macro)
```

### 2. Initialize Token

```bash
# Run deployment script
npm run deploy-token

# Or manually with TypeScript
npx ts-node scripts/deploy-token.ts
```

### 3. Test the Bonding Curve

```bash
# Run tests
anchor test

# Test buying tokens
npm run test:buy

# Test selling tokens
npm run test:sell
```

## Deploy to Mainnet (Production)

### ⚠️ Pre-flight Checklist

- [ ] Smart contract audited by reputable firm
- [ ] All tests passing
- [ ] Devnet deployment tested thoroughly
- [ ] Website and socials ready
- [ ] Marketing campaign prepared
- [ ] Legal review complete
- [ ] Team has sufficient SOL for deployment (~5 SOL recommended)

### 1. Switch to Mainnet

```bash
solana config set --url mainnet-beta

# Verify you're on mainnet
solana config get
```

### 2. Fund Deployment Wallet

```bash
# Check balance
solana balance

# You need:
# - ~2 SOL for program deployment
# - ~1 SOL for account rent
# - ~2 SOL for initial liquidity/operations
```

### 3. Deploy

```bash
# Deploy program to mainnet
anchor deploy --provider.cluster mainnet

# IMPORTANT: Save the Program ID!
```

### 4. Update Configuration

Update the following with your new Program ID:

**programs/kiro-token/src/lib.rs:**
```rust
declare_id!("YOUR_ACTUAL_PROGRAM_ID_HERE");
```

**Anchor.toml:**
```toml
[programs.mainnet]
kiro_token = "YOUR_ACTUAL_PROGRAM_ID_HERE"
```

**website/app.js:**
```javascript
const PROGRAM_ID = "YOUR_ACTUAL_PROGRAM_ID_HERE";
```

### 5. Initialize Token on Mainnet

```bash
# Set network to mainnet
export NETWORK=mainnet
export RPC_URL=https://api.mainnet-beta.solana.com

# Run initialization
npm run deploy-token
```

### 6. Verify Deployment

```bash
# Check program exists
solana program show YOUR_PROGRAM_ID

# Check token mint
spl-token display YOUR_TOKEN_MINT_ADDRESS

# View on Solscan
# https://solscan.io/token/YOUR_TOKEN_MINT_ADDRESS
```

## Post-Deployment

### 1. Update Website

```bash
# Update contract address in website
cd website

# Edit index.html
# Update the contract address display

# Deploy website
# (Use Vercel, Netlify, or your preferred hosting)
```

### 2. Submit for Verification

- **Solscan**: Submit token info and logo
- **Jupiter Aggregator**: Submit for listing
- **CoinGecko**: Apply for listing
- **CoinMarketCap**: Apply for listing

### 3. Security

```bash
# Transfer upgrade authority (optional, for extra security)
solana program set-upgrade-authority YOUR_PROGRAM_ID --new-upgrade-authority MULTISIG_ADDRESS

# Or revoke upgradability completely (irreversible!)
solana program set-upgrade-authority YOUR_PROGRAM_ID --final
```

### 4. Announce Launch

- Tweet from official account
- Post in Discord/Telegram
- Submit to crypto news sites
- Contact influencers

## Monitoring

### Check Program Health

```bash
# View program account
solana account YOUR_PROGRAM_ID

# Check transactions
solana transaction-history YOUR_PROGRAM_ID
```

### Monitor Token Stats

```bash
# Check token supply
spl-token supply YOUR_TOKEN_MINT

# Check holder count (via Solscan API)
curl "https://public-api.solscan.io/token/holders?tokenAddress=YOUR_TOKEN_MINT"
```

## Troubleshooting

### Deployment Fails

```bash
# Check balance
solana balance

# Check network status
solana cluster-version

# Increase timeout
solana config set --commitment confirmed --timeout 300
```

### Program Size Too Large

```bash
# Optimize build
cargo build-bpf --features no-entrypoint

# Or increase program size
solana program extend YOUR_PROGRAM_ID 100000
```

### Transaction Simulation Failed

- Check account balance
- Verify all PDAs are correctly derived
- Check instruction data format
- Review recent network updates

## Cost Estimates

### Devnet (Free)
- SOL from faucet
- No real costs

### Mainnet
- Program deployment: ~2 SOL
- Token mint creation: ~0.01 SOL
- Token account rent: ~0.002 SOL per account
- Bonding curve initialization: ~0.05 SOL
- Testing transactions: ~0.1 SOL
- **Total**: ~2.2 SOL (~$200-300 depending on SOL price)

## Security Best Practices

1. **Never share private keys**
2. **Use hardware wallet for mainnet**
3. **Test everything on devnet first**
4. **Get professional audit**
5. **Start with small amounts**
6. **Monitor transactions constantly**
7. **Have emergency procedures ready**
8. **Use multisig for critical operations**

## Support

If you encounter issues:

1. Check Solana status: https://status.solana.com/
2. Review Anchor docs: https://www.anchor-lang.com/
3. Join Solana Discord: https://discord.gg/solana
4. Review Solana Stack Exchange

## Next Steps After Deployment

1. **Marketing blitz**: Social media, influencers, press
2. **Community building**: Discord, Telegram active
3. **Liquidity provision**: Once bonding curve completes
4. **Exchange listings**: DEXs, then CEXs
5. **Continuous engagement**: Memes, contests, updates

---

**Remember**: You can't undo a mainnet deployment. Triple-check everything!

🚀 Good luck, and may KIRO moon! 🌕
