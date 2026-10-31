# 🧪 Starpad - Devnet Testing Guide

## Step 1: Install Prerequisites

### 1.1 Install Rust
```powershell
# Download from: https://www.rust-lang.org/tools/install
# Or use rustup
winget install Rustlang.Rustup

# Verify
rustc --version
cargo --version
```

### 1.2 Install Solana CLI
```powershell
# Download installer
Invoke-WebRequest -Uri "https://release.solana.com/v1.17.0/solana-install-init-x86_64-pc-windows-msvc.exe" -OutFile "solana-install.exe"

# Run installer
.\solana-install.exe

# Add to PATH (restart terminal after)
# Verify
solana --version
```

### 1.3 Install Anchor
```powershell
# Install Anchor Version Manager
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor
avm install latest
avm use latest

# Verify
anchor --version
```

### 1.4 Install Node.js
```powershell
# Download from: https://nodejs.org/
# Version 18 or higher required

# Verify
node --version
npm --version
```

## Step 2: Setup Solana Wallet

### 2.1 Create Devnet Wallet
```powershell
# Navigate to project
cd C:\Users\ahmet\Desktop\MC

# Create new keypair
solana-keygen new --outfile devnet-wallet.json

# IMPORTANT: Save the seed phrase shown!
# You'll see: "pubkey: YOUR_PUBLIC_KEY"
```

### 2.2 Configure Solana CLI
```powershell
# Set to devnet
solana config set --url devnet

# Set default keypair
solana config set --keypair devnet-wallet.json

# Verify config
solana config get
```

### 2.3 Get Devnet SOL (Free)
```powershell
# Airdrop 2 SOL (can do multiple times)
solana airdrop 2

# Check balance
solana balance

# If airdrop fails, use faucet:
# https://faucet.solana.com/
```

## Step 3: Setup Database (Supabase)

### 3.1 Create Supabase Project
1. Go to https://supabase.com/
2. Sign up / Log in
3. Click "New Project"
4. Fill in:
   - Name: starpad-devnet
   - Database Password: (save this!)
   - Region: Choose closest to you
5. Wait for project to initialize (~2 minutes)

### 3.2 Run Database Schema
1. In Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Copy entire contents of `database-schema.sql`
4. Paste and click "Run"
5. Should see: "Success. No rows returned"

### 3.3 Get API Keys
1. Go to Settings → API
2. Copy:
   - Project URL
   - `anon` `public` key
3. Save these for `.env` file

## Step 4: Configure Environment

### 4.1 Create .env File
```powershell
# Copy example
Copy-Item .env.example .env

# Edit .env
notepad .env
```

### 4.2 Fill in .env
```env
# Solana Network
NETWORK=devnet
RPC_URL=https://api.devnet.solana.com

# Will be filled after deployment
PROGRAM_ID=

# Platform wallet (your devnet wallet address)
PLATFORM_WALLET=YOUR_WALLET_ADDRESS_HERE

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Server
PORT=3000
WS_PORT=8080

# Get your wallet address with:
# solana address
```

## Step 5: Install Dependencies

```powershell
# Install Node packages
npm install

# Should install:
# - @solana/web3.js
# - @project-serum/anchor
# - Express and security packages
# - etc.

# Check for errors
# If any, run: npm install --force
```

## Step 6: Build Smart Contract

```powershell
# Build Anchor program
anchor build

# This takes 2-5 minutes first time
# Output: target/deploy/pump_platform.so
```

**Expected Output:**
```
Compiling pump-platform v0.1.0
Finished release [optimized] target(s) in 3m 45s
```

**If errors:**
- Check Rust version: `rustc --version`
- Update Anchor: `avm install latest`
- Clean and rebuild: `anchor clean && anchor build`

## Step 7: Deploy to Devnet

### 7.1 Deploy Program
```powershell
# Make sure you're on devnet
solana config get

# Deploy (costs ~2 SOL)
anchor deploy --provider.cluster devnet
```

**Expected Output:**
```
Deploying workspace: https://api.devnet.solana.com
Upgrade authority: YOUR_WALLET_ADDRESS
Deploying program "pump-platform"...
Program Id: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

Deploy success
```

### 7.2 Save Program ID
```powershell
# Copy the Program ID from output above
# Example: 8qbHbw2BbbTHBW1sbeqakYXVKRQM8Ne7pLK7m6CVfeR

# Update .env
notepad .env
# Add: PROGRAM_ID=YOUR_ACTUAL_PROGRAM_ID

# Also update: target/idl/pump_platform.json
notepad target\idl\pump_platform.json
# Find "metadata" section
# Update "address" field with your Program ID
```

### 7.3 Verify Deployment
```powershell
# Check program exists
solana program show YOUR_PROGRAM_ID

# Should show:
# Program Id: YOUR_PROGRAM_ID
# Owner: BPFLoaderUpgradeab1e...
# Data Length: ~xxxxx bytes
```

## Step 8: Test Smart Contract

### 8.1 Run Anchor Tests
```powershell
# Run test suite
anchor test --skip-deploy

# Tests will:
# - Create mock tokens
# - Test buy/sell
# - Verify bonding curve
# - Check permissions
```

### 8.2 Manual Contract Test
```powershell
# Start Solana logs (in new terminal)
solana logs YOUR_PROGRAM_ID

# Keep this running to see transactions
```

## Step 9: Start Backend API

### 9.1 Start API Server
```powershell
# In first terminal
npm run api

# Should see:
# 🚀 API Server running on port 3000
# 💬 WebSocket server running on port 8080
```

### 9.2 Test API Endpoints
```powershell
# In new terminal, test with curl or browser

# Get tokens
curl http://localhost:3000/api/tokens

# Should return: []

# Health check
curl http://localhost:3000/health
```

## Step 10: Start Frontend

### 10.1 Serve Frontend
```powershell
# In new terminal
cd website
npx serve .

# Or use:
# python -m http.server 8080
# Or any static server

# Should see:
# Serving on http://localhost:3000
```

### 10.2 Open in Browser
```
http://localhost:3000/platform.html
```

## Step 11: Install Phantom Wallet (Devnet)

### 11.1 Install Extension
1. Go to: https://phantom.app/
2. Click "Download"
3. Install browser extension
4. Click extension icon
5. Create new wallet or import

### 11.2 Switch to Devnet
1. Open Phantom
2. Click ⚙️ Settings
3. Scroll to "Developer Settings"
4. Click "Change Network"
5. Select "Devnet"
6. You'll see "Devnet" badge at top

### 11.3 Get Devnet SOL in Phantom
1. Click "Deposit"
2. Copy your address
3. Go to: https://faucet.solana.com/
4. Paste address
5. Click "Airdrop 1 SOL"
6. Wait ~30 seconds
7. Check balance in Phantom

## Step 12: Test the Platform! 🎉

### 12.1 Connect Wallet
1. Open http://localhost:3000/platform.html
2. Click "Connect Wallet"
3. Phantom popup appears
4. Click "Connect"
5. Button should show your address

### 12.2 Create Test Token
1. Click "Launch" in nav
2. Fill form:
   - Name: "Test Token"
   - Symbol: "TEST"
   - Description: "This is my first test token on Starpad!"
   - Upload image (any image)
   - Twitter: https://twitter.com/test (optional)
3. Click "Launch Token"
4. Phantom popup for signature
5. Click "Approve"
6. Wait for confirmation (~30-60 seconds)
7. Should see success message!

### 12.3 Test Buy Tokens
1. Find your token in the list
2. Click to open detail modal
3. Enter amount: 0.1 SOL
4. See estimated tokens received
5. Check price impact
6. Click "Buy Tokens"
7. Approve in Phantom
8. Wait for confirmation
9. Should see tokens in wallet!

### 12.4 Test Sell Tokens
1. In same token detail
2. Click "Sell" tab
3. Enter token amount
4. See estimated SOL received
5. Click "Sell Tokens"
6. Approve in Phantom
7. Receive SOL back

### 12.5 Test Chat
1. In token detail page
2. Scroll to chat section
3. Type a message
4. Press Enter
5. Should appear immediately
6. Open in another browser/incognito
7. See messages sync in real-time!

## Step 13: Verify Everything Works

### ✅ Checklist

**Smart Contract:**
- [ ] Program deployed
- [ ] Token created successfully
- [ ] Buy transaction works
- [ ] Sell transaction works
- [ ] Fees collected correctly
- [ ] Bonding curve calculates right

**Backend:**
- [ ] API responding
- [ ] WebSocket connected
- [ ] Chat messages syncing
- [ ] Trades saving to database
- [ ] Rate limiting working

**Frontend:**
- [ ] Wallet connects
- [ ] Create token form works
- [ ] Token list displays
- [ ] Token detail opens
- [ ] Buy/sell interface works
- [ ] Chart displays
- [ ] Chat functional

**Database:**
- [ ] Tokens table populated
- [ ] Messages saving
- [ ] Trades recording
- [ ] Stats calculating

## Troubleshooting

### Issue: "Insufficient funds"
```powershell
# Get more SOL
solana airdrop 2

# Or use faucet
# https://faucet.solana.com/
```

### Issue: "Program deployment failed"
```powershell
# Check balance
solana balance

# Check config
solana config get

# Try with explicit keypair
anchor deploy --provider.cluster devnet --provider.wallet devnet-wallet.json
```

### Issue: "Transaction simulation failed"
```powershell
# Watch logs
solana logs YOUR_PROGRAM_ID

# Check program exists
solana program show YOUR_PROGRAM_ID
```

### Issue: "API not connecting"
```powershell
# Check if running
netstat -an | findstr 3000

# Check .env variables
cat .env

# Restart API
npm run api
```

### Issue: "WebSocket not connecting"
```powershell
# Check WS_PORT in .env
# Default is 8080

# Check firewall
# Allow port 8080 in Windows Firewall
```

### Issue: "Database error"
```powershell
# Verify Supabase URL and Key
# Check in Supabase dashboard

# Test connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/
```

### Issue: "Phantom not showing devnet"
```
# Make sure:
1. Settings → Developer Settings enabled
2. Network switched to "Devnet"
3. Devnet badge visible at top
4. If not, reinstall Phantom
```

## Viewing Logs & Debugging

### Smart Contract Logs
```powershell
# Terminal 1: Watch all logs
solana logs

# Terminal 2: Watch your program only
solana logs YOUR_PROGRAM_ID
```

### Backend Logs
```powershell
# API logs shown in terminal where you ran:
npm run api

# Add more logging:
# Edit src/api-backend.ts
# Add console.log() statements
```

### Frontend Logs
```
# Open browser DevTools
# F12 or Right-click → Inspect
# Go to Console tab
# See JavaScript logs and errors
```

### Database Logs
```
# In Supabase dashboard:
# 1. Go to "Logs"
# 2. Select "API Logs"
# 3. See all database queries
```

## Performance Testing

### Test Load
```powershell
# Install artillery
npm install -g artillery

# Create test config: artillery.yml
# Run load test
artillery run artillery.yml
```

### Monitor Resources
```powershell
# Watch API memory/CPU
# Task Manager → Node.js processes

# Monitor devnet
# https://explorer.solana.com/?cluster=devnet
```

## Next Steps After Devnet Works

1. **Document Issues**: Note any bugs or UX problems
2. **Get Feedback**: Share with friends/beta testers
3. **Optimize**: Improve performance bottlenecks
4. **Security Review**: Self-audit before professional audit
5. **Mainnet Prep**: Plan launch strategy

## Cost on Devnet

Everything is FREE! ✨
- Program deployment: Free devnet SOL
- Transactions: Free devnet SOL
- Database: Free Supabase tier
- API hosting: Local (free)

## Ready for Mainnet?

Before mainnet:
- [ ] Professional audit ($15k-50k)
- [ ] Load testing (1000+ users)
- [ ] Bug bounty setup
- [ ] Legal review
- [ ] 24/7 monitoring ready
- [ ] Incident response plan
- [ ] Sufficient SOL (~5 SOL for deployment)

---

**Need Help?**
- Check SECURITY.md for security info
- Check SETUP-REAL.md for production setup
- Check logs for error messages

**Good luck! 🚀**
