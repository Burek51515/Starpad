// Backend API for Chat, Comments, and Database
// This would run on a Node.js server (e.g., Express)

import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createClient } from '@supabase/supabase-js';
import security from './api-security';

// Initialize Supabase (or use PostgreSQL directly)
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_KEY || ''
);

const app = express();

// Apply security middleware
app.use(security.helmetConfig);
app.use(security.corsConfig);
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(security.suspiciousActivityMiddleware);

// WebSocket server for real-time chat
const wss = new WebSocketServer({ port: 8080 });

// Store active connections per token
const tokenRooms = new Map<string, Set<WebSocket>>();

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
    let currentRoom: string | null = null;

    ws.on('message', async (data: string) => {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'join':
                    // Join a token's chat room
                    currentRoom = message.tokenId;
                    if (!tokenRooms.has(currentRoom)) {
                        tokenRooms.set(currentRoom, new Set());
                    }
                    tokenRooms.get(currentRoom)!.add(ws);
                    
                    // Send recent messages
                    const recentMessages = await getRecentMessages(currentRoom);
                    ws.send(JSON.stringify({
                        type: 'history',
                        messages: recentMessages
                    }));
                    break;

                case 'message':
                    // Broadcast message to room
                    if (currentRoom) {
                        const savedMessage = await saveMessage({
                            tokenId: currentRoom,
                            userId: message.userId,
                            username: message.username,
                            content: message.content,
                            timestamp: Date.now()
                        });

                        broadcast(currentRoom, {
                            type: 'new_message',
                            message: savedMessage
                        });
                    }
                    break;

                case 'trade':
                    // Broadcast trade notification
                    if (currentRoom) {
                        await saveTrade({
                            tokenId: currentRoom,
                            userId: message.userId,
                            type: message.tradeType,
                            solAmount: message.solAmount,
                            tokenAmount: message.tokenAmount,
                            timestamp: Date.now()
                        });

                        broadcast(currentRoom, {
                            type: 'new_trade',
                            trade: message
                        });
                    }
                    break;
            }
        } catch (error) {
            console.error('WebSocket error:', error);
        }
    });

    ws.on('close', () => {
        if (currentRoom && tokenRooms.has(currentRoom)) {
            tokenRooms.get(currentRoom)!.delete(ws);
        }
    });
});

function broadcast(room: string, data: any) {
    const clients = tokenRooms.get(room);
    if (clients) {
        const message = JSON.stringify(data);
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

// REST API Endpoints

// Get all tokens (with caching and rate limiting)
app.get('/api/tokens', 
    security.rateLimiters.general,
    async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tokens')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100); // Limit results

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error fetching tokens:', error);
        res.status(500).json({ error: 'Failed to fetch tokens' });
    }
});

// Get token by ID
app.get('/api/tokens/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tokens')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(404).json({ error: 'Token not found' });
    }
});

// Get token stats
app.get('/api/tokens/:id/stats', async (req, res) => {
    try {
        // Fetch from blockchain + cache
        const stats = await getTokenStats(req.params.id);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get chat messages
app.get('/api/tokens/:id/messages', async (req, res) => {
    try {
        const messages = await getRecentMessages(req.params.id, 100);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Get recent trades
app.get('/api/tokens/:id/trades', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('token_id', req.params.id)
            .order('timestamp', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch trades' });
    }
});

// Get top holders
app.get('/api/tokens/:id/holders', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('holders')
            .select('*')
            .eq('token_id', req.params.id)
            .order('amount', { ascending: false })
            .limit(50);

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch holders' });
    }
});

// Save token metadata (with validation and rate limiting)
app.post('/api/tokens',
    security.rateLimiters.createToken,
    security.validators.createToken,
    security.handleValidationErrors,
    async (req, res) => {
    try {
        // Sanitize inputs
        const sanitized = {
            ...req.body,
            name: security.sanitizeInput(req.body.name),
            symbol: security.sanitizeInput(req.body.symbol),
            description: security.sanitizeInput(req.body.description),
        };

        const { data, error } = await supabase
            .from('tokens')
            .insert([sanitized])
            .select()
            .single();

        if (error) throw error;
        
        console.log(`✅ Token created: ${sanitized.symbol}`);
        res.json(data);
    } catch (error) {
        console.error('Error saving token:', error);
        res.status(500).json({ error: 'Failed to save token' });
    }
});

// Upload image
app.post('/api/upload', async (req, res) => {
    try {
        // In production: upload to S3, Cloudflare R2, or IPFS
        // For now, return a placeholder
        const imageUrl = 'https://placeholder.com/image.jpg';
        res.json({ url: imageUrl });
    } catch (error) {
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

// Helper functions
async function getRecentMessages(tokenId: string, limit: number = 50) {
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('token_id', tokenId)
        .order('timestamp', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data.reverse(); // Return oldest first
}

async function saveMessage(message: any) {
    const { data, error } = await supabase
        .from('messages')
        .insert([{
            token_id: message.tokenId,
            user_id: message.userId,
            username: message.username,
            content: message.content,
            timestamp: message.timestamp
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function saveTrade(trade: any) {
    const { data, error } = await supabase
        .from('trades')
        .insert([{
            token_id: trade.tokenId,
            user_id: trade.userId,
            type: trade.type,
            sol_amount: trade.solAmount,
            token_amount: trade.tokenAmount,
            timestamp: trade.timestamp
        }])
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function getTokenStats(tokenId: string) {
    // Aggregate stats from trades
    const { data: trades } = await supabase
        .from('trades')
        .select('*')
        .eq('token_id', tokenId)
        .gte('timestamp', Date.now() - 86400000); // Last 24h

    const volume24h = trades?.reduce((sum, t) => sum + parseFloat(t.sol_amount), 0) || 0;

    return {
        volume24h,
        trades24h: trades?.length || 0
    };
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
    console.log(`💬 WebSocket server running on port 8080`);
});

export default app;
