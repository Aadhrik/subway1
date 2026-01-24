/**
 * Dashboard State API
 * Saves and loads dashboard layout state
 * 
 * Works with Vercel KV in production or file storage locally
 */

// For local development, use in-memory storage
// In production with Vercel KV, replace with kv.get/kv.set
let memoryStore = {};

// Try to use Vercel KV if available
let kv = null;
try {
    // This will be available when @vercel/kv is installed and configured
    kv = require('@vercel/kv');
} catch (e) {
    // Vercel KV not available, use memory store
}

async function getState(key) {
    if (kv && kv.get) {
        try {
            return await kv.get(key);
        } catch (e) {
            console.error('KV get error:', e);
        }
    }
    return memoryStore[key] || null;
}

async function setState(key, value) {
    if (kv && kv.set) {
        try {
            await kv.set(key, value);
            return true;
        } catch (e) {
            console.error('KV set error:', e);
        }
    }
    memoryStore[key] = value;
    return true;
}

// Vercel serverless function handler
module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const stateKey = 'dashboard-layout-v1';

    try {
        if (req.method === 'GET') {
            // Load state
            const state = await getState(stateKey);
            return res.status(200).json({
                success: true,
                data: state,
                timestamp: Date.now()
            });
        }

        if (req.method === 'POST') {
            // Save state
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            
            if (!body || !body.layout) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing layout data'
                });
            }

            const stateData = {
                layout: body.layout,
                savedAt: Date.now(),
                version: 1
            };

            await setState(stateKey, stateData);

            return res.status(200).json({
                success: true,
                message: 'State saved',
                timestamp: Date.now()
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('Dashboard state API error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};


