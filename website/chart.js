// Advanced Charting System
// Using lightweight-charts for performance

class TokenChart {
    constructor(containerId, tokenData) {
        this.container = document.getElementById(containerId);
        this.tokenData = tokenData;
        this.chart = null;
        this.candleSeries = null;
        this.volumeSeries = null;
        this.timeframe = '5m';
        this.init();
    }

    init() {
        if (!this.container) return;

        // Create chart
        this.chart = LightweightCharts.createChart(this.container, {
            width: this.container.clientWidth,
            height: 400,
            layout: {
                background: { color: '#16162a' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: 'rgba(153, 69, 255, 0.1)' },
                horzLines: { color: 'rgba(153, 69, 255, 0.1)' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: 'rgba(153, 69, 255, 0.3)',
            },
            timeScale: {
                borderColor: 'rgba(153, 69, 255, 0.3)',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Candlestick series
        this.candleSeries = this.chart.addCandlestickSeries({
            upColor: '#14F195',
            downColor: '#ff4444',
            borderUpColor: '#14F195',
            borderDownColor: '#ff4444',
            wickUpColor: '#14F195',
            wickDownColor: '#ff4444',
        });

        // Volume series (histogram)
        this.volumeSeries = this.chart.addHistogramSeries({
            color: '#9945FF',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        // Load initial data
        this.loadData();

        // Handle resize
        window.addEventListener('resize', () => {
            this.chart.resize(this.container.clientWidth, 400);
        });

        // Auto-update
        this.startAutoUpdate();
    }

    loadData() {
        // Generate mock price data based on bonding curve
        const data = this.generateMockData();
        this.candleSeries.setData(data.candles);
        this.volumeSeries.setData(data.volume);
    }

    generateMockData() {
        const now = Math.floor(Date.now() / 1000);
        const intervals = {
            '1m': 60,
            '5m': 300,
            '15m': 900,
            '1h': 3600,
            '4h': 14400,
            '1d': 86400
        };
        
        const interval = intervals[this.timeframe] || 300;
        const points = 100;
        
        const candles = [];
        const volume = [];
        
        // Start from bonding curve price
        let basePrice = 0.00001;
        let currentPrice = basePrice;
        
        for (let i = points; i > 0; i--) {
            const time = now - (i * interval);
            
            // Simulate price movement (trending up with volatility)
            const trend = 1 + (Math.random() * 0.02);
            const volatility = 1 + ((Math.random() - 0.5) * 0.1);
            
            const open = currentPrice;
            const close = currentPrice * trend * volatility;
            const high = Math.max(open, close) * (1 + Math.random() * 0.05);
            const low = Math.min(open, close) * (1 - Math.random() * 0.05);
            
            candles.push({
                time: time,
                open: open,
                high: high,
                low: low,
                close: close
            });
            
            // Generate volume
            const baseVolume = 1000 + Math.random() * 5000;
            const volumeMultiplier = Math.abs(close - open) / open > 0.05 ? 2 : 1;
            
            volume.push({
                time: time,
                value: baseVolume * volumeMultiplier,
                color: close > open ? 'rgba(20, 241, 149, 0.5)' : 'rgba(255, 68, 68, 0.5)'
            });
            
            currentPrice = close;
        }
        
        return { candles, volume };
    }

    updateTimeframe(newTimeframe) {
        this.timeframe = newTimeframe;
        this.loadData();
    }

    addTrade(price, amount, isBuy) {
        // Add new data point when trade happens
        const lastCandle = this.candleSeries.data[this.candleSeries.data.length - 1];
        const now = Math.floor(Date.now() / 1000);
        
        if (lastCandle && now - lastCandle.time < 60) {
            // Update current candle
            lastCandle.close = price;
            lastCandle.high = Math.max(lastCandle.high, price);
            lastCandle.low = Math.min(lastCandle.low, price);
            this.candleSeries.update(lastCandle);
        } else {
            // New candle
            const newCandle = {
                time: now,
                open: price,
                high: price,
                low: price,
                close: price
            };
            this.candleSeries.update(newCandle);
        }
        
        // Add volume bar
        const newVolume = {
            time: now,
            value: amount,
            color: isBuy ? 'rgba(20, 241, 149, 0.5)' : 'rgba(255, 68, 68, 0.5)'
        };
        this.volumeSeries.update(newVolume);
    }

    startAutoUpdate() {
        // Simulate live price updates
        setInterval(() => {
            const data = this.generateMockData();
            const lastCandle = data.candles[data.candles.length - 1];
            const lastVolume = data.volume[data.volume.length - 1];
            
            this.candleSeries.update(lastCandle);
            this.volumeSeries.update(lastVolume);
        }, 5000); // Update every 5 seconds
    }

    destroy() {
        if (this.chart) {
            this.chart.remove();
        }
    }
}

// Chart Controls Component
class ChartControls {
    constructor(chart) {
        this.chart = chart;
        this.setupControls();
    }

    setupControls() {
        const controls = document.getElementById('chartControls');
        if (!controls) return;

        controls.innerHTML = `
            <div class="chart-controls">
                <div class="timeframe-buttons">
                    <button class="tf-btn" data-tf="1m">1m</button>
                    <button class="tf-btn active" data-tf="5m">5m</button>
                    <button class="tf-btn" data-tf="15m">15m</button>
                    <button class="tf-btn" data-tf="1h">1h</button>
                    <button class="tf-btn" data-tf="4h">4h</button>
                    <button class="tf-btn" data-tf="1d">1D</button>
                </div>
                
                <div class="chart-indicators">
                    <button class="indicator-btn" data-indicator="volume">
                        <span>📊</span> Volume
                    </button>
                    <button class="indicator-btn" data-indicator="ma">
                        <span>📈</span> MA
                    </button>
                    <button class="indicator-btn" data-indicator="rsi">
                        <span>📉</span> RSI
                    </button>
                </div>
                
                <div class="chart-options">
                    <button class="option-btn" id="fullscreenBtn">
                        <span>⛶</span> Fullscreen
                    </button>
                    <button class="option-btn" id="screenshotBtn">
                        <span>📸</span> Screenshot
                    </button>
                </div>
            </div>
        `;

        // Timeframe buttons
        document.querySelectorAll('.tf-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const tf = e.target.dataset.tf;
                this.chart.updateTimeframe(tf);
            });
        });

        // Fullscreen
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Screenshot
        document.getElementById('screenshotBtn')?.addEventListener('click', () => {
            this.takeScreenshot();
        });
    }

    toggleFullscreen() {
        const chartContainer = document.querySelector('.chart-container');
        if (!document.fullscreenElement) {
            chartContainer.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    takeScreenshot() {
        // In production, use canvas.toDataURL() or html2canvas
        alert('📸 Screenshot feature coming soon!');
    }
}

// Price Stats Component
class PriceStats {
    constructor(tokenData) {
        this.tokenData = tokenData;
        this.render();
        this.startUpdates();
    }

    render() {
        const container = document.getElementById('priceStats');
        if (!container) return;

        const stats = this.calculateStats();

        container.innerHTML = `
            <div class="price-stats-grid">
                <div class="price-stat-item">
                    <span class="price-stat-label">Price</span>
                    <span class="price-stat-value">$${stats.price.toFixed(8)}</span>
                    <span class="price-stat-change ${stats.change24h >= 0 ? 'positive' : 'negative'}">
                        ${stats.change24h >= 0 ? '↗' : '↘'} ${Math.abs(stats.change24h).toFixed(2)}%
                    </span>
                </div>
                
                <div class="price-stat-item">
                    <span class="price-stat-label">24h High</span>
                    <span class="price-stat-value">$${stats.high24h.toFixed(8)}</span>
                </div>
                
                <div class="price-stat-item">
                    <span class="price-stat-label">24h Low</span>
                    <span class="price-stat-value">$${stats.low24h.toFixed(8)}</span>
                </div>
                
                <div class="price-stat-item">
                    <span class="price-stat-label">24h Volume</span>
                    <span class="price-stat-value">${this.formatCurrency(stats.volume24h)}</span>
                </div>
                
                <div class="price-stat-item">
                    <span class="price-stat-label">All Time High</span>
                    <span class="price-stat-value">$${stats.ath.toFixed(8)}</span>
                    <span class="price-stat-change negative">
                        ↘ ${stats.athChange.toFixed(1)}%
                    </span>
                </div>
                
                <div class="price-stat-item">
                    <span class="price-stat-label">Liquidity</span>
                    <span class="price-stat-value">${this.formatCurrency(stats.liquidity)}</span>
                </div>
            </div>
        `;
    }

    calculateStats() {
        // Mock calculation - in production, fetch from API
        const basePrice = 0.000045;
        const volatility = 0.2;
        
        return {
            price: basePrice * (1 + (Math.random() - 0.5) * 0.1),
            change24h: (Math.random() - 0.3) * 100,
            high24h: basePrice * (1 + Math.random() * volatility),
            low24h: basePrice * (1 - Math.random() * volatility),
            volume24h: 15000 + Math.random() * 10000,
            ath: basePrice * 1.5,
            athChange: -25 + Math.random() * 10,
            liquidity: 30000 + Math.random() * 20000
        };
    }

    formatCurrency(value) {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${value.toFixed(0)}`;
    }

    startUpdates() {
        setInterval(() => {
            this.render();
        }, 10000); // Update every 10 seconds
    }
}

// Initialize chart when coin detail opens
let currentChart = null;

function initializeChart(tokenData) {
    // Clean up old chart
    if (currentChart) {
        currentChart.destroy();
    }

    // Create new chart
    currentChart = new TokenChart('chartContainer', tokenData);
    new ChartControls(currentChart);
    new PriceStats(tokenData);
}

// Export for use in main platform.js
window.ChartSystem = {
    initialize: initializeChart,
    addTrade: (price, amount, isBuy) => {
        if (currentChart) {
            currentChart.addTrade(price, amount, isBuy);
        }
    }
};

console.log('📊 Advanced Charting System loaded!');
