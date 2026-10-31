// Configuration
const CONFIG = {
    // API URLs - Update these after deploying backend!
    API_URL: process.env.API_URL || 'http://localhost:3000',
    WS_URL: process.env.WS_URL || 'ws://localhost:8080',
    
    // Solana
    PROGRAM_ID: process.env.PROGRAM_ID || 'YourProgramIDHere',
    RPC_URL: process.env.RPC_URL || 'https://api.devnet.solana.com',
    
    // Bonding curve parameters
    targetMarketCap: 69000,
    virtualSolReserves: 30,
    virtualTokenReserves: 1073000000,
    decimals: 9
};

// State
let state = {
    currentMarketCap: 0,
    currentPrice: 0,
    holders: 0,
    solReserves: CONFIG.virtualSolReserves,
    tokenReserves: CONFIG.virtualTokenReserves,
    walletConnected: false
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeStats();
    setupEventListeners();
    startStatsAnimation();
});

function initializeStats() {
    // Simulate some initial activity
    state.currentMarketCap = Math.random() * 10000;
    state.holders = Math.floor(Math.random() * 100) + 10;
    calculatePrice();
    updateUI();
}

function calculatePrice() {
    // Simple bonding curve: price = sol_reserves / token_reserves
    state.currentPrice = state.solReserves / state.tokenReserves;
}

function calculateTokensOut(solAmount) {
    // Constant product formula: x * y = k
    const k = state.solReserves * state.tokenReserves;
    const newSolReserves = state.solReserves + solAmount;
    const newTokenReserves = k / newSolReserves;
    const tokensOut = state.tokenReserves - newTokenReserves;
    
    return {
        tokensOut: tokensOut,
        priceImpact: ((solAmount / state.solReserves) * 100).toFixed(2),
        newPrice: newSolReserves / newTokenReserves
    };
}

function updateUI() {
    // Update market cap
    document.getElementById('mcap').textContent = formatCurrency(state.currentMarketCap);
    
    // Update holders
    document.getElementById('holders').textContent = state.holders.toLocaleString();
    
    // Update price
    document.getElementById('price').textContent = `$${state.currentPrice.toFixed(6)}`;
    
    // Update progress to Raydium
    const progress = (state.currentMarketCap / CONFIG.targetMarketCap) * 100;
    document.getElementById('progress').textContent = `${Math.min(progress, 100).toFixed(1)}%`;
    document.getElementById('progressBar').style.width = `${Math.min(progress, 100)}%`;
}

function setupEventListeners() {
    // Buy button
    document.getElementById('buyBtn').addEventListener('click', () => {
        if (!state.walletConnected) {
            connectWallet();
        } else {
            // Open swap interface
            document.querySelector('.bonding-curve').scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    // Chart button
    document.getElementById('chartBtn').addEventListener('click', () => {
        alert('🚀 Chart coming soon! Launch first, then we moon! 📈');
    });
    
    // SOL input
    const solInput = document.getElementById('solInput');
    solInput.addEventListener('input', (e) => {
        const solAmount = parseFloat(e.target.value) || 0;
        if (solAmount > 0) {
            const result = calculateTokensOut(solAmount);
            document.getElementById('kiroOutput').value = formatNumber(result.tokensOut);
            document.getElementById('priceImpact').textContent = `~${result.priceImpact}%`;
            
            // Change color based on price impact
            const impactElement = document.getElementById('priceImpact');
            if (result.priceImpact > 5) {
                impactElement.style.color = '#ff4444';
            } else if (result.priceImpact > 2) {
                impactElement.style.color = '#ffaa00';
            } else {
                impactElement.style.color = '#14F195';
            }
        } else {
            document.getElementById('kiroOutput').value = '';
            document.getElementById('priceImpact').textContent = '~0.00%';
        }
    });
    
    // Swap button
    document.getElementById('swapBtn').addEventListener('click', () => {
        if (!state.walletConnected) {
            connectWallet();
        } else {
            executeSwap();
        }
    });
    
    // Social buttons
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('🚀 Social links coming soon! Join us on launch day!');
        });
    });
}

function connectWallet() {
    // Simulate wallet connection
    // In production, use @solana/wallet-adapter
    
    const wallets = ['Phantom', 'Solflare', 'Backpack'];
    const randomWallet = wallets[Math.floor(Math.random() * wallets.length)];
    
    // Simulate connection delay
    document.getElementById('swapBtn').innerHTML = '<span>Connecting...</span>';
    
    setTimeout(() => {
        state.walletConnected = true;
        document.getElementById('swapBtn').innerHTML = '<span>Swap SOL for KIRO</span>';
        showNotification(`✅ ${randomWallet} Connected!`, 'success');
    }, 1500);
}

function executeSwap() {
    const solAmount = parseFloat(document.getElementById('solInput').value);
    
    if (!solAmount || solAmount <= 0) {
        showNotification('⚠️ Please enter an amount', 'warning');
        return;
    }
    
    if (solAmount < 0.01) {
        showNotification('⚠️ Minimum swap: 0.01 SOL', 'warning');
        return;
    }
    
    // Simulate transaction
    const result = calculateTokensOut(solAmount);
    
    document.getElementById('swapBtn').innerHTML = '<span>Swapping...</span>';
    document.getElementById('swapBtn').disabled = true;
    
    setTimeout(() => {
        // Update state
        state.solReserves = state.solReserves + solAmount;
        state.tokenReserves = state.tokenReserves - result.tokensOut;
        state.currentMarketCap += solAmount * 150; // Approximate USD value
        state.holders += Math.random() > 0.7 ? 1 : 0; // Sometimes new holder
        calculatePrice();
        updateUI();
        
        // Reset form
        document.getElementById('solInput').value = '';
        document.getElementById('kiroOutput').value = '';
        document.getElementById('swapBtn').innerHTML = '<span>Swap SOL for KIRO</span>';
        document.getElementById('swapBtn').disabled = false;
        
        showNotification(`🎉 Success! You received ${formatNumber(result.tokensOut)} KIRO!`, 'success');
        
        // Check if target reached
        if (state.currentMarketCap >= CONFIG.targetMarketCap) {
            setTimeout(() => {
                showNotification('🚀 BONDING CURVE COMPLETE! MIGRATING TO RAYDIUM! 🚀', 'success');
            }, 2000);
        }
    }, 2000);
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style it
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'success' ? '#14F195' : type === 'warning' ? '#ffaa00' : '#ff4444',
        color: '#0a0a0f',
        padding: '20px 30px',
        borderRadius: '12px',
        fontWeight: '700',
        fontSize: '1rem',
        zIndex: '10000',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        animation: 'slideIn 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function startStatsAnimation() {
    // Simulate live market activity
    setInterval(() => {
        // Random small changes
        const randomChange = (Math.random() - 0.5) * 100;
        state.currentMarketCap = Math.max(0, state.currentMarketCap + randomChange);
        
        // Occasionally add holders
        if (Math.random() > 0.9) {
            state.holders += 1;
        }
        
        // Small price fluctuations
        state.solReserves = state.solReserves * (1 + (Math.random() - 0.5) * 0.001);
        calculatePrice();
        updateUI();
    }, 3000);
}

function formatCurrency(value) {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
    } else {
        return `$${value.toFixed(0)}`;
    }
}

function formatNumber(value) {
    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
        return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
        return `${(value / 1000).toFixed(2)}K`;
    } else {
        return value.toFixed(2);
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('🚀 KIRO COIN loaded! Ready to moon! 🌕');
