// PUMP PLATFORM - Main JavaScript
// Full launchpad functionality

// Mock data for demonstration
let mockCoins = [
    {
        id: 1,
        name: "KIRO COIN",
        symbol: "KIRO",
        description: "The AI Coding Revolution. Code is dead, long live AI agents! 🤖",
        image: "https://via.placeholder.com/200?text=🤖",
        creator: "ABC...XYZ123",
        createdAt: Date.now() - 3600000,
        marketCap: 45000,
        price: 0.000045,
        holders: 234,
        volume24h: 15000,
        twitter: "https://twitter.com/kirocoin",
        telegram: "https://t.me/kirocoin",
        website: "https://kirocoin.io",
        graduated: false,
        posts: [
            { content: "🚀 Just launched! LFG!", type: "announcement", timestamp: Date.now() - 3000000, likes: 45 },
            { content: "First 100 holders get special role in Discord!", type: "marketing", timestamp: Date.now() - 2000000, likes: 67 }
        ]
    },
    {
        id: 2,
        name: "PEPE 2.0",
        symbol: "PEPE2",
        description: "The frog is back and he's angrier than ever! 🐸",
        image: "https://via.placeholder.com/200?text=🐸",
        creator: "DEF...ABC456",
        createdAt: Date.now() - 7200000,
        marketCap: 72000,
        price: 0.000072,
        holders: 456,
        volume24h: 28000,
        graduated: true,
        posts: [
            { content: "WE GRADUATED! 🎉 Now on Raydium!", type: "milestone", timestamp: Date.now() - 1000000, likes: 156 }
        ]
    },
    {
        id: 3,
        name: "Moon Lambo",
        symbol: "MLAMBO",
        description: "Wen lambo? Now lambo! 🚗💨",
        image: "https://via.placeholder.com/200?text=🚗",
        creator: "GHI...DEF789",
        createdAt: Date.now() - 1800000,
        marketCap: 8500,
        price: 0.0000085,
        holders: 89,
        volume24h: 3200,
        posts: []
    }
];

let currentFilter = 'all';
let connectedWallet = null;
let currentCoin = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderCoins();
    setupEventListeners();
    updatePlatformStats();
});

function setupEventListeners() {
    // Connect wallet
    document.getElementById('connectWallet')?.addEventListener('click', connectWallet);
    
    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderCoins();
        });
    });
    
    // Search
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        renderCoins(e.target.value);
    });
    
    // Create coin modal
    const createLink = document.querySelector('a[href="#create"]');
    if (createLink) {
        createLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (!connectedWallet) {
                alert('Please connect your wallet first!');
                return;
            }
            document.getElementById('createModal').style.display = 'flex';
        });
    }
    
    // Close modals
    document.getElementById('closeModal')?.addEventListener('click', () => {
        document.getElementById('createModal').style.display = 'none';
    });
    
    document.getElementById('closeCoinModal')?.addEventListener('click', () => {
        document.getElementById('coinModal').style.display = 'none';
    });
    
    // Create form
    document.getElementById('createForm')?.addEventListener('submit', handleCreateCoin);
    
    // Image preview
    document.getElementById('imageInput')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('imagePreview').innerHTML = 
                    `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Trade tabs
    document.querySelectorAll('.trade-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            
            if (tabName === 'buy') {
                document.getElementById('buyPanel').style.display = 'block';
                document.getElementById('sellPanel').style.display = 'none';
            } else {
                document.getElementById('buyPanel').style.display = 'none';
                document.getElementById('sellPanel').style.display = 'block';
            }
        });
    });
    
    // Buy/Sell amount inputs
    document.getElementById('buyAmountSol')?.addEventListener('input', calculateBuyAmount);
    document.getElementById('sellAmountTokens')?.addEventListener('input', calculateSellAmount);
    
    // Buy/Sell buttons
    document.getElementById('btnBuy')?.addEventListener('click', handleBuy);
    document.getElementById('btnSell')?.addEventListener('click', handleSell);
    
    // Post update
    document.getElementById('submitPost')?.addEventListener('click', handlePostUpdate);
}

function connectWallet() {
    // Simulate wallet connection
    // In production: use @solana/wallet-adapter
    
    const wallets = ['Phantom', 'Solflare', 'Backpack'];
    const wallet = wallets[Math.floor(Math.random() * wallets.length)];
    
    setTimeout(() => {
        connectedWallet = {
            publicKey: generateMockAddress(),
            name: wallet
        };
        
        const btn = document.getElementById('connectWallet');
        btn.innerHTML = `<span class="wallet-icon">✅</span><span>${connectedWallet.publicKey.slice(0,4)}...${connectedWallet.publicKey.slice(-4)}</span>`;
        btn.classList.add('connected');
        
        showNotification(`✅ ${wallet} Connected!`, 'success');
    }, 1000);
}

function renderCoins(searchTerm = '') {
    const grid = document.getElementById('coinsGrid');
    if (!grid) return;
    
    let filtered = [...mockCoins];
    
    // Apply filter
    if (currentFilter === 'new') {
        filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (currentFilter === 'graduating') {
        filtered = filtered.filter(c => !c.graduated && c.marketCap > 50000);
    } else if (currentFilter === 'graduated') {
        filtered = filtered.filter(c => c.graduated);
    } else {
        // Hot: sort by volume
        filtered.sort((a, b) => b.volume24h - a.volume24h);
    }
    
    // Apply search
    if (searchTerm) {
        filtered = filtered.filter(c => 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    grid.innerHTML = filtered.map(coin => `
        <div class="coin-card" onclick="openCoinDetail(${coin.id})">
            <div class="coin-card-header">
                <img src="${coin.image}" alt="${coin.name}" class="coin-card-image">
                ${coin.graduated ? '<span class="graduated-badge">🎓 Graduated</span>' : ''}
            </div>
            <div class="coin-card-body">
                <h3 class="coin-card-title">${coin.name}</h3>
                <span class="coin-card-symbol">$${coin.symbol}</span>
                <p class="coin-card-description">${coin.description}</p>
                
                <div class="coin-card-stats">
                    <div class="coin-stat">
                        <span class="coin-stat-label">MCap</span>
                        <span class="coin-stat-value">${formatCurrency(coin.marketCap)}</span>
                    </div>
                    <div class="coin-stat">
                        <span class="coin-stat-label">24h Vol</span>
                        <span class="coin-stat-value">${formatCurrency(coin.volume24h)}</span>
                    </div>
                    <div class="coin-stat">
                        <span class="coin-stat-label">Holders</span>
                        <span class="coin-stat-value">${coin.holders}</span>
                    </div>
                </div>
                
                ${!coin.graduated ? `
                    <div class="coin-progress">
                        <div class="coin-progress-bar">
                            <div class="coin-progress-fill" style="width: ${(coin.marketCap / 69000) * 100}%"></div>
                        </div>
                        <span class="coin-progress-text">${((coin.marketCap / 69000) * 100).toFixed(1)}% to DEX</span>
                    </div>
                ` : ''}
                
                <div class="coin-card-footer">
                    <span class="coin-creator">👤 ${coin.creator}</span>
                    <span class="coin-time">${formatTimeAgo(coin.createdAt)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function openCoinDetail(coinId) {
    currentCoin = mockCoins.find(c => c.id === coinId);
    if (!currentCoin) return;
    
    // Initialize chart and chat
    if (window.ChartSystem) {
        window.ChartSystem.initialize(currentCoin);
    }
    if (window.ChatSystem) {
        window.ChatSystem.initialize(currentCoin.id);
    }
    
    // Populate modal
    document.getElementById('detailImage').src = currentCoin.image;
    document.getElementById('detailName').textContent = currentCoin.name;
    document.getElementById('detailSymbol').textContent = `$${currentCoin.symbol}`;
    document.getElementById('detailCreator').textContent = currentCoin.creator;
    document.getElementById('detailDescription').textContent = currentCoin.description;
    document.getElementById('detailMcap').textContent = formatCurrency(currentCoin.marketCap);
    document.getElementById('detailPrice').textContent = `$${currentCoin.price.toFixed(8)}`;
    document.getElementById('detailHolders').textContent = currentCoin.holders;
    document.getElementById('detailVolume').textContent = formatCurrency(currentCoin.volume24h);
    
    // Update token symbols in trade panel
    document.getElementById('buyTokenSymbol').textContent = currentCoin.symbol;
    document.getElementById('sellTokenSymbol').textContent = currentCoin.symbol;
    
    // Social links
    const socialsDiv = document.getElementById('detailSocials');
    socialsDiv.innerHTML = '';
    if (currentCoin.twitter) {
        socialsDiv.innerHTML += `<a href="${currentCoin.twitter}" target="_blank" class="social-link">🐦 Twitter</a>`;
    }
    if (currentCoin.telegram) {
        socialsDiv.innerHTML += `<a href="${currentCoin.telegram}" target="_blank" class="social-link">✈️ Telegram</a>`;
    }
    if (currentCoin.website) {
        socialsDiv.innerHTML += `<a href="${currentCoin.website}" target="_blank" class="social-link">🌐 Website</a>`;
    }
    
    // Progress bar
    const progress = (currentCoin.marketCap / 69000) * 100;
    document.getElementById('progressPercent').textContent = `${progress.toFixed(1)}%`;
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('currentMcap').textContent = formatCurrency(currentCoin.marketCap);
    
    // Posts
    renderPosts();
    
    // Show post form if user is creator
    if (connectedWallet && connectedWallet.publicKey === currentCoin.creator) {
        document.getElementById('postForm').style.display = 'block';
    }
    
    // Show modal
    document.getElementById('coinModal').style.display = 'flex';
}

function renderPosts() {
    const container = document.getElementById('postsContainer');
    if (!currentCoin || !currentCoin.posts || currentCoin.posts.length === 0) {
        container.innerHTML = '<p class="no-posts">No updates yet</p>';
        return;
    }
    
    container.innerHTML = currentCoin.posts.map(post => `
        <div class="post-item">
            <div class="post-header">
                <span class="post-type ${post.type}">${getPostTypeIcon(post.type)}</span>
                <span class="post-time">${formatTimeAgo(post.timestamp)}</span>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-footer">
                <button class="post-like-btn">❤️ ${post.likes}</button>
            </div>
        </div>
    `).join('');
}

function getPostTypeIcon(type) {
    const icons = {
        general: '💬',
        announcement: '📢',
        milestone: '🎉',
        marketing: '📣'
    };
    return icons[type] || '💬';
}

function calculateBuyAmount() {
    const solAmount = parseFloat(document.getElementById('buyAmountSol').value) || 0;
    
    if (solAmount === 0) {
        document.getElementById('buyAmountTokens').value = '';
        document.getElementById('buyPriceImpact').textContent = '~0%';
        return;
    }
    
    // Simple bonding curve calculation (constant product)
    const virtualSol = 30; // 30 SOL virtual
    const virtualTokens = 1073000000; // 1.073B tokens
    
    const k = virtualSol * virtualTokens;
    const newSol = virtualSol + (solAmount * 0.99); // After fees
    const newTokens = k / newSol;
    const tokensOut = virtualTokens - newTokens;
    
    document.getElementById('buyAmountTokens').value = formatNumber(tokensOut);
    document.getElementById('buyPriceImpact').textContent = `~${((solAmount / virtualSol) * 100).toFixed(2)}%`;
    document.getElementById('buyPlatformFee').textContent = `${(solAmount * 0.005).toFixed(4)} SOL`;
    document.getElementById('buyCreatorFee').textContent = `${(solAmount * 0.005).toFixed(4)} SOL`;
}

function calculateSellAmount() {
    const tokenAmount = parseFloat(document.getElementById('sellAmountTokens').value) || 0;
    
    if (tokenAmount === 0) {
        document.getElementById('sellAmountSol').value = '';
        document.getElementById('sellPriceImpact').textContent = '~0%';
        return;
    }
    
    const virtualSol = 30;
    const virtualTokens = 1073000000;
    
    const k = virtualSol * virtualTokens;
    const newTokens = virtualTokens + tokenAmount;
    const newSol = k / newTokens;
    const solOut = (virtualSol - newSol) * 0.99; // After fees
    
    document.getElementById('sellAmountSol').value = solOut.toFixed(6);
    document.getElementById('sellPriceImpact').textContent = `~${((tokenAmount / virtualTokens) * 100).toFixed(2)}%`;
    document.getElementById('sellFees').textContent = `${((virtualSol - newSol) * 0.01).toFixed(6)} SOL`;
}

function handleBuy() {
    if (!connectedWallet) {
        alert('Please connect your wallet first!');
        return;
    }
    
    const solAmount = parseFloat(document.getElementById('buyAmountSol').value);
    
    if (!solAmount || solAmount < 0.01) {
        alert('Minimum buy: 0.01 SOL');
        return;
    }
    
    // Simulate transaction
    showNotification('⏳ Transaction pending...', 'info');
    
    setTimeout(() => {
        showNotification(`✅ Bought ${document.getElementById('buyAmountTokens').value} ${currentCoin.symbol}!`, 'success');
        
        // Update coin stats (simulate)
        currentCoin.marketCap += solAmount * 150;
        currentCoin.holders += Math.random() > 0.5 ? 1 : 0;
        currentCoin.volume24h += solAmount * 150;
        
        // Reset form
        document.getElementById('buyAmountSol').value = '';
        document.getElementById('buyAmountTokens').value = '';
        
        // Refresh
        openCoinDetail(currentCoin.id);
    }, 2000);
}

function handleSell() {
    if (!connectedWallet) {
        alert('Please connect your wallet first!');
        return;
    }
    
    const tokenAmount = parseFloat(document.getElementById('sellAmountTokens').value);
    
    if (!tokenAmount || tokenAmount <= 0) {
        alert('Please enter an amount');
        return;
    }
    
    showNotification('⏳ Transaction pending...', 'info');
    
    setTimeout(() => {
        showNotification(`✅ Sold ${tokenAmount} ${currentCoin.symbol}!`, 'success');
        
        // Reset
        document.getElementById('sellAmountTokens').value = '';
        document.getElementById('sellAmountSol').value = '';
    }, 2000);
}

function handleCreateCoin(e) {
    e.preventDefault();
    
    if (!connectedWallet) {
        alert('Please connect wallet first!');
        return;
    }
    
    const formData = new FormData(e.target);
    
    showNotification('🚀 Creating your coin...', 'info');
    
    setTimeout(() => {
        const newCoin = {
            id: mockCoins.length + 1,
            name: formData.get('name'),
            symbol: formData.get('symbol'),
            description: formData.get('description'),
            image: 'https://via.placeholder.com/200?text=' + formData.get('symbol'),
            creator: connectedWallet.publicKey,
            createdAt: Date.now(),
            marketCap: 0,
            price: 0.00000001,
            holders: 1,
            volume24h: 0,
            twitter: formData.get('twitter') || null,
            telegram: formData.get('telegram') || null,
            website: formData.get('website') || null,
            graduated: false,
            posts: []
        };
        
        mockCoins.unshift(newCoin);
        
        showNotification('✅ Coin created successfully!', 'success');
        document.getElementById('createModal').style.display = 'none';
        e.target.reset();
        renderCoins();
        
        // Open the new coin
        setTimeout(() => openCoinDetail(newCoin.id), 500);
    }, 2500);
}

function handlePostUpdate() {
    const content = document.getElementById('postContent').value.trim();
    
    if (!content) {
        alert('Please enter some content');
        return;
    }
    
    if (!currentCoin) return;
    
    const newPost = {
        content: content,
        type: 'general',
        timestamp: Date.now(),
        likes: 0
    };
    
    currentCoin.posts.unshift(newPost);
    
    showNotification('✅ Update posted!', 'success');
    document.getElementById('postContent').value = '';
    renderPosts();
}

function updatePlatformStats() {
    document.getElementById('totalCoins').textContent = mockCoins.length.toLocaleString();
    
    const totalVolume = mockCoins.reduce((sum, coin) => sum + coin.volume24h, 0);
    document.getElementById('volume24h').textContent = formatCurrency(totalVolume);
    
    const totalHolders = mockCoins.reduce((sum, coin) => sum + coin.holders, 0);
    document.getElementById('activeTraders').textContent = totalHolders.toLocaleString();
    
    const graduated = mockCoins.filter(c => c.graduated).length;
    document.getElementById('graduated').textContent = graduated;
}

// Utility functions
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

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function generateMockAddress() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 44; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: type === 'success' ? '#14F195' : type === 'info' ? '#9945FF' : '#ff4444',
        color: type === 'info' ? 'white' : '#0a0a0f',
        padding: '16px 24px',
        borderRadius: '12px',
        fontWeight: '700',
        zIndex: '100000',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        animation: 'slideIn 0.3s ease'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

console.log('🚀 PUMP Platform loaded!');
