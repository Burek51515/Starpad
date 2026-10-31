// Backend Security Layer for Starpad
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { body, param, query, validationResult } from 'express-validator';
import crypto from 'crypto';

// Rate limiting configurations
export const createRateLimiter = (windowMs: number, max: number) => {
    return rateLimit({
        windowMs: windowMs,
        max: max,
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });
};

// Different rate limits for different endpoints
export const rateLimiters = {
    // Token creation: 1 per hour per IP
    createToken: createRateLimiter(60 * 60 * 1000, 1),
    
    // Trading: 30 per minute per IP
    trading: createRateLimiter(60 * 1000, 30),
    
    // Chat messages: 10 per minute per user
    chat: createRateLimiter(60 * 1000, 10),
    
    // General API: 100 per minute
    general: createRateLimiter(60 * 1000, 100),
};

// Helmet configuration for security headers
export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "https://unpkg.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.devnet.solana.com", "https://api.mainnet-beta.solana.com"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
});

// CORS configuration
export const corsConfig = cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200,
});

// Input validation schemas
export const validators = {
    createToken: [
        body('name')
            .trim()
            .isLength({ min: 2, max: 32 })
            .matches(/^[a-zA-Z0-9\s\-_]+$/)
            .withMessage('Invalid token name'),
        body('symbol')
            .trim()
            .isLength({ min: 2, max: 10 })
            .matches(/^[A-Z0-9]+$/)
            .withMessage('Invalid token symbol'),
        body('description')
            .trim()
            .isLength({ min: 10, max: 500 })
            .withMessage('Description must be 10-500 characters'),
        body('imageUri')
            .trim()
            .isURL()
            .isLength({ max: 200 })
            .withMessage('Invalid image URL'),
        body('twitter')
            .optional()
            .trim()
            .isURL()
            .withMessage('Invalid Twitter URL'),
        body('telegram')
            .optional()
            .trim()
            .isURL()
            .withMessage('Invalid Telegram URL'),
        body('website')
            .optional()
            .trim()
            .isURL()
            .withMessage('Invalid website URL'),
    ],
    
    message: [
        body('content')
            .trim()
            .isLength({ min: 1, max: 500 })
            .matches(/^[^<>{}]*$/) // Prevent HTML/script injection
            .withMessage('Invalid message content'),
        body('tokenId')
            .trim()
            .matches(/^[a-zA-Z0-9]+$/)
            .withMessage('Invalid token ID'),
    ],
    
    trade: [
        body('amount')
            .isFloat({ min: 0.01, max: 1000 })
            .withMessage('Invalid amount'),
        body('minOut')
            .isFloat({ min: 0 })
            .withMessage('Invalid minimum output'),
    ],
    
    tokenId: [
        param('id')
            .trim()
            .matches(/^[a-zA-Z0-9]+$/)
            .withMessage('Invalid token ID'),
    ],
};

// Validation error handler
export const handleValidationErrors = (req: any, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: 'Validation failed', 
            details: errors.array() 
        });
    }
    next();
};

// Sanitize user input
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/[<>{}]/g, '') // Remove potentially dangerous characters
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
}

// Generate secure random token
export function generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

// Hash sensitive data
export function hashData(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

// Verify signature (for WebSocket authentication)
export function verifySignature(
    message: string,
    signature: string,
    publicKey: string
): boolean {
    try {
        // Implement proper signature verification using Solana's ed25519
        // This is a placeholder
        return true;
    } catch (error) {
        return false;
    }
}

// SQL injection prevention (use with parameterized queries)
export function sanitizeSQL(input: string): string {
    return input.replace(/['";\\]/g, '');
}

// Prevent NoSQL injection
export function sanitizeNoSQL(obj: any): any {
    if (typeof obj === 'string') {
        return sanitizeInput(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitizeNoSQL);
    }
    if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = {};
        for (const key in obj) {
            // Remove $ operators that could be injection
            if (!key.startsWith('$')) {
                sanitized[key] = sanitizeNoSQL(obj[key]);
            }
        }
        return sanitized;
    }
    return obj;
}

// IP-based request tracking for abuse detection
const requestTracker = new Map<string, number[]>();

export function trackRequest(ip: string): boolean {
    const now = Date.now();
    const requests = requestTracker.get(ip) || [];
    
    // Remove requests older than 1 hour
    const recent = requests.filter(time => now - time < 3600000);
    recent.push(now);
    requestTracker.set(ip, recent);
    
    // Flag if more than 1000 requests in an hour
    return recent.length > 1000;
}

// Clean up old tracking data periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, requests] of requestTracker.entries()) {
        const recent = requests.filter(time => now - time < 3600000);
        if (recent.length === 0) {
            requestTracker.delete(ip);
        } else {
            requestTracker.set(ip, recent);
        }
    }
}, 600000); // Every 10 minutes

// Middleware to detect suspicious activity
export const suspiciousActivityMiddleware = (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    if (trackRequest(ip)) {
        console.warn(`⚠️ Suspicious activity detected from IP: ${ip}`);
        // In production, you might want to block or throttle
    }
    
    next();
};

// Content security validation
export function isSecureContent(content: string): boolean {
    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i,
        /<iframe/i,
        /eval\(/i,
        /document\./i,
        /window\./i,
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(content));
}

// Validate Solana address
export function isValidSolanaAddress(address: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

// Validate transaction signature
export function isValidSignature(signature: string): boolean {
    return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature);
}

export default {
    rateLimiters,
    helmetConfig,
    corsConfig,
    validators,
    handleValidationErrors,
    sanitizeInput,
    generateSecureToken,
    hashData,
    verifySignature,
    suspiciousActivityMiddleware,
    isSecureContent,
    isValidSolanaAddress,
    isValidSignature,
};
