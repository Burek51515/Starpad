// Real-time Chat & Comments System

class ChatSystem {
    constructor(tokenId) {
        this.tokenId = tokenId;
        this.messages = [];
        this.users = new Map();
        this.container = document.getElementById('chatContainer');
        this.init();
    }

    init() {
        if (!this.container) return;

        this.render();
        this.setupEventListeners();
        this.loadMessages();
        this.startAutoScroll();
        
        // Simulate other users
        this.simulateActivity();
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-system">
                <div class="chat-header">
                    <div class="chat-tabs">
                        <button class="chat-tab active" data-tab="chat">
                            💬 Live Chat
                            <span class="chat-count" id="chatCount">0</span>
                        </button>
                        <button class="chat-tab" data-tab="trades">
                            🔄 Live Trades
                            <span class="chat-count" id="tradesCount">0</span>
                        </button>
                        <button class="chat-tab" data-tab="holders">
                            👥 Holders
                            <span class="chat-count" id="holdersCount">0</span>
                        </button>
                    </div>
                </div>

                <div class="chat-content">
                    <!-- Chat Tab -->
                    <div class="chat-panel active" id="chatPanel">
                        <div class="messages-container" id="messagesContainer">
                            <!-- Messages will be loaded here -->
                        </div>
                        <div class="chat-input-container">
                            <input 
                                type="text" 
                                class="chat-input" 
                                id="chatInput" 
                                placeholder="Type a message... (Enter to send)"
                                maxlength="500"
                            >
                            <div class="chat-actions">
                                <button class="emoji-btn" id="emojiBtn">😊</button>
                                <button class="send-btn" id="sendBtn">
                                    <span>Send</span>
                                    <span class="send-icon">→</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Trades Tab -->
                    <div class="chat-panel" id="tradesPanel">
                        <div class="trades-container" id="tradesContainer">
                            <!-- Live trades will be shown here -->
                        </div>
                    </div>

                    <!-- Holders Tab -->
                    <div class="chat-panel" id="holdersPanel">
                        <div class="holders-container" id="holdersContainer">
                            <!-- Top holders will be shown here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.chat-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Send message
        const sendBtn = document.getElementById('sendBtn');
        const chatInput = document.getElementById('chatInput');

        sendBtn?.addEventListener('click', () => this.sendMessage());
        chatInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Emoji picker
        document.getElementById('emojiBtn')?.addEventListener('click', () => {
            this.showEmojiPicker();
        });
    }

    switchTab(tabName) {
        // Update tabs
        document.querySelectorAll('.chat-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update panels
        document.querySelectorAll('.chat-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`${tabName}Panel`).classList.add('active');

        // Load data for the tab
        if (tabName === 'trades') {
            this.loadTrades();
        } else if (tabName === 'holders') {
            this.loadHolders();
        }
    }

    loadMessages() {
        // Load initial messages (mock data)
        const initialMessages = [
            { user: 'anon_trader', text: 'Just bought 1M tokens! LFG! 🚀', timestamp: Date.now() - 300000, type: 'message' },
            { user: 'crypto_degen', text: 'This is going to 100x easy', timestamp: Date.now() - 240000, type: 'message' },
            { user: 'whale_hunter', text: 'Bought 5 SOL worth 💎', timestamp: Date.now() - 180000, type: 'trade' },
            { user: 'moon_boy', text: 'Wen moon? 🌕', timestamp: Date.now() - 120000, type: 'message' },
            { user: 'diamond_hands', text: 'HODLING till $1!!! 💪', timestamp: Date.now() - 60000, type: 'message' }
        ];

        this.messages = initialMessages;
        this.renderMessages();
        document.getElementById('chatCount').textContent = this.messages.length;
    }

    renderMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        container.innerHTML = this.messages.map(msg => {
            const userColor = this.getUserColor(msg.user);
            return `
                <div class="chat-message ${msg.type}">
                    <div class="message-header">
                        <span class="message-user" style="color: ${userColor}">
                            ${msg.user}
                        </span>
                        <span class="message-time">${this.formatTimeAgo(msg.timestamp)}</span>
                    </div>
                    <div class="message-text">${this.escapeHtml(msg.text)}</div>
                </div>
            `;
        }).join('');

        // Auto scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();

        if (!text) return;

        if (!connectedWallet) {
            showNotification('Connect wallet to chat!', 'info');
            return;
        }

        const message = {
            user: connectedWallet.publicKey.slice(0, 8) + '...',
            text: text,
            timestamp: Date.now(),
            type: 'message'
        };

        this.messages.push(message);
        this.renderMessages();
        
        input.value = '';
        document.getElementById('chatCount').textContent = this.messages.length;

        // Play sound (optional)
        this.playMessageSound();
    }

    showEmojiPicker() {
        const emojis = ['🚀', '💎', '🔥', '💰', '🌕', '📈', '💪', '👀', '🎉', '⚡', 
                        '😂', '❤️', '💯', '🙏', '👍', '🤑', '🐂', '🐻', '🦍', '🤝'];
        
        const input = document.getElementById('chatInput');
        const picker = document.createElement('div');
        picker.className = 'emoji-picker';
        picker.innerHTML = emojis.map(e => `<span class="emoji-option">${e}</span>`).join('');
        
        // Position picker
        const btn = document.getElementById('emojiBtn');
        picker.style.position = 'absolute';
        picker.style.bottom = '60px';
        picker.style.left = '10px';
        
        btn.parentElement.appendChild(picker);

        // Add emoji on click
        picker.querySelectorAll('.emoji-option').forEach(opt => {
            opt.addEventListener('click', () => {
                input.value += opt.textContent;
                picker.remove();
            });
        });

        // Remove on outside click
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!picker.contains(e.target) && e.target !== btn) {
                    picker.remove();
                }
            }, { once: true });
        }, 100);
    }

    loadTrades() {
        const container = document.getElementById('tradesContainer');
        if (!container) return;

        // Generate mock recent trades
        const trades = [];
        for (let i = 0; i < 20; i++) {
            const isBuy = Math.random() > 0.4;
            const amount = (Math.random() * 5).toFixed(3);
            const tokens = (Math.random() * 10000000).toFixed(0);
            const time = Date.now() - (i * 30000);
            
            trades.push({
                type: isBuy ? 'buy' : 'sell',
                amount: amount,
                tokens: tokens,
                time: time,
                user: this.generateUsername()
            });
        }

        container.innerHTML = `
            <div class="trades-list">
                ${trades.map(trade => `
                    <div class="trade-item ${trade.type}">
                        <div class="trade-info">
                            <span class="trade-type-badge ${trade.type}">
                                ${trade.type === 'buy' ? '↗ BUY' : '↘ SELL'}
                            </span>
                            <span class="trade-user">${trade.user}</span>
                        </div>
                        <div class="trade-amounts">
                            <span class="trade-sol">${trade.amount} SOL</span>
                            <span class="trade-tokens">${this.formatNumber(trade.tokens)} tokens</span>
                        </div>
                        <div class="trade-time">${this.formatTimeAgo(trade.time)}</div>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('tradesCount').textContent = trades.length;
    }

    loadHolders() {
        const container = document.getElementById('holdersContainer');
        if (!container) return;

        // Generate mock top holders
        const holders = [];
        let remainingSupply = 1000000000;
        
        for (let i = 0; i < 50; i++) {
            const percentage = (Math.random() * 5 * (50 - i) / 50).toFixed(2);
            const amount = (remainingSupply * percentage / 100).toFixed(0);
            remainingSupply -= amount;
            
            holders.push({
                rank: i + 1,
                address: this.generateAddress(),
                amount: amount,
                percentage: percentage,
                username: i < 5 ? this.generateUsername() : null // Only show usernames for top 5
            });
        }

        container.innerHTML = `
            <div class="holders-list">
                <div class="holders-header">
                    <span>Rank</span>
                    <span>Address</span>
                    <span>Amount</span>
                    <span>%</span>
                </div>
                ${holders.map(holder => `
                    <div class="holder-item ${holder.rank <= 10 ? 'top-holder' : ''}">
                        <span class="holder-rank">${holder.rank}</span>
                        <span class="holder-address">
                            ${holder.username || holder.address}
                            ${holder.rank === 1 ? '👑' : ''}
                        </span>
                        <span class="holder-amount">${this.formatNumber(holder.amount)}</span>
                        <span class="holder-percentage">${holder.percentage}%</span>
                    </div>
                `).join('')}
            </div>
        `;

        document.getElementById('holdersCount').textContent = holders.length;
    }

    simulateActivity() {
        // Simulate new messages every 10-30 seconds
        setInterval(() => {
            if (Math.random() > 0.5 && document.querySelector('.chat-panel.active')?.id === 'chatPanel') {
                const messages = [
                    'Just aped in! 🚀',
                    'This is the one! 💎',
                    'LFG!!!! 🔥',
                    'Moon mission activated 🌕',
                    'Early gang! 💪',
                    'Buying more dip! 📈',
                    'Diamond hands baby! 💎🙌',
                    'This will 100x easy',
                    'Devs are based! 🔥',
                    'Chart looking bullish! 📊'
                ];

                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                
                const newMsg = {
                    user: this.generateUsername(),
                    text: randomMessage,
                    timestamp: Date.now(),
                    type: 'message'
                };

                this.messages.push(newMsg);
                if (this.messages.length > 100) {
                    this.messages.shift(); // Keep only last 100 messages
                }
                
                this.renderMessages();
                document.getElementById('chatCount').textContent = this.messages.length;
            }
        }, 15000 + Math.random() * 15000);
    }

    startAutoScroll() {
        // Keep chat scrolled to bottom when new messages arrive
        const observer = new MutationObserver(() => {
            const container = document.getElementById('messagesContainer');
            if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
                if (isNearBottom) {
                    container.scrollTop = container.scrollHeight;
                }
            }
        });

        const container = document.getElementById('messagesContainer');
        if (container) {
            observer.observe(container, { childList: true });
        }
    }

    // Utility methods
    getUserColor(username) {
        // Generate consistent color for each user
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 60%)`;
    }

    generateUsername() {
        const adjectives = ['Diamond', 'Moon', 'Crypto', 'Chad', 'Degen', 'Ape', 'Whale', 'Bull', 'Based', 'Alpha'];
        const nouns = ['Trader', 'Investor', 'Holder', 'Buyer', 'Hunter', 'Lord', 'King', 'Master', 'God', 'Legend'];
        return `${adjectives[Math.floor(Math.random() * adjectives.length)]}_${nouns[Math.floor(Math.random() * nouns.length)]}`;
    }

    generateAddress() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
        let address = '';
        for (let i = 0; i < 8; i++) {
            address += chars[Math.floor(Math.random() * chars.length)];
        }
        return address + '...' + address.slice(0, 4);
    }

    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        return `${Math.floor(seconds / 86400)}d`;
    }

    formatNumber(value) {
        const num = parseFloat(value);
        if (num >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`;
        if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
        return num.toFixed(0);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    playMessageSound() {
        // Optional: Play subtle notification sound
        // const audio = new Audio('data:audio/wav;base64,...');
        // audio.volume = 0.3;
        // audio.play().catch(() => {});
    }

    destroy() {
        // Cleanup
        this.messages = [];
        this.users.clear();
    }
}

// Initialize chat when coin detail opens
let currentChat = null;

function initializeChat(tokenId) {
    if (currentChat) {
        currentChat.destroy();
    }
    currentChat = new ChatSystem(tokenId);
}

// Export for use in platform.js
window.ChatSystem = {
    initialize: initializeChat,
    addTrade: (type, amount, user) => {
        if (currentChat) {
            const trade = {
                type: type,
                amount: amount,
                user: user,
                timestamp: Date.now()
            };
            // Add to trades list
        }
    }
};

console.log('💬 Chat & Comments System loaded!');
