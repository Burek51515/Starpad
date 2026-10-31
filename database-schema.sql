-- Database Schema for Pump Platform
-- Use with PostgreSQL or Supabase

-- Tokens table
CREATE TABLE tokens (
    id TEXT PRIMARY KEY,
    mint TEXT UNIQUE NOT NULL,
    creator TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    twitter TEXT,
    telegram TEXT,
    website TEXT,
    total_supply BIGINT NOT NULL,
    circulating_supply BIGINT DEFAULT 0,
    market_cap DECIMAL DEFAULT 0,
    price DECIMAL DEFAULT 0,
    bonding_curve_active BOOLEAN DEFAULT true,
    graduated BOOLEAN DEFAULT false,
    graduation_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_tokens_created_at ON tokens(created_at DESC);
CREATE INDEX idx_tokens_market_cap ON tokens(market_cap DESC);
CREATE INDEX idx_tokens_graduated ON tokens(graduated);

-- Messages/Chat table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    token_id TEXT REFERENCES tokens(id),
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_token_time ON messages(token_id, timestamp DESC);

-- Trades table
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    token_id TEXT REFERENCES tokens(id),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
    sol_amount DECIMAL NOT NULL,
    token_amount DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    signature TEXT UNIQUE NOT NULL,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trades_token_time ON trades(token_id, timestamp DESC);
CREATE INDEX idx_trades_user ON trades(user_id, timestamp DESC);

-- Holders table
CREATE TABLE holders (
    id SERIAL PRIMARY KEY,
    token_id TEXT REFERENCES tokens(id),
    user_id TEXT NOT NULL,
    username TEXT,
    amount DECIMAL NOT NULL,
    percentage DECIMAL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(token_id, user_id)
);

CREATE INDEX idx_holders_token_amount ON holders(token_id, amount DESC);

-- Posts/Updates from creators
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    token_id TEXT REFERENCES tokens(id),
    creator TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('general', 'announcement', 'milestone', 'marketing')),
    likes INTEGER DEFAULT 0,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posts_token_time ON posts(token_id, timestamp DESC);

-- User profiles (optional)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT,
    avatar_url TEXT,
    created_tokens INTEGER DEFAULT 0,
    total_volume DECIMAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Platform stats (for dashboard)
CREATE TABLE platform_stats (
    id SERIAL PRIMARY KEY,
    total_tokens INTEGER DEFAULT 0,
    total_volume DECIMAL DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    active_traders INTEGER DEFAULT 0,
    graduated_tokens INTEGER DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    UNIQUE(date)
);

-- Function to update token stats
CREATE OR REPLACE FUNCTION update_token_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tokens
    SET circulating_supply = (
        SELECT SUM(amount) FROM holders WHERE token_id = NEW.token_id
    ),
    updated_at = NOW()
    WHERE id = NEW.token_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stats
CREATE TRIGGER trigger_update_token_stats
AFTER INSERT OR UPDATE ON holders
FOR EACH ROW
EXECUTE FUNCTION update_token_stats();

-- Function to calculate 24h volume
CREATE OR REPLACE FUNCTION get_24h_volume(token_id_param TEXT)
RETURNS DECIMAL AS $$
DECLARE
    volume DECIMAL;
BEGIN
    SELECT COALESCE(SUM(sol_amount), 0) INTO volume
    FROM trades
    WHERE token_id = token_id_param
    AND timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000;
    
    RETURN volume;
END;
$$ LANGUAGE plpgsql;

-- View for trending tokens
CREATE OR REPLACE VIEW trending_tokens AS
SELECT 
    t.*,
    get_24h_volume(t.id) as volume_24h,
    COUNT(tr.id) as trades_24h,
    COUNT(DISTINCT h.user_id) as holder_count
FROM tokens t
LEFT JOIN trades tr ON tr.token_id = t.id 
    AND tr.timestamp > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours') * 1000
LEFT JOIN holders h ON h.token_id = t.id
GROUP BY t.id
ORDER BY volume_24h DESC;

-- Insert initial platform stats
INSERT INTO platform_stats (total_tokens, date) VALUES (0, CURRENT_DATE);
