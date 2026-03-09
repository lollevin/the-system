/**
 * WhatsApp Service - Main Entry Point
 * 
 * This service manages WhatsApp Web.js connection and provides
 * API endpoints for sending messages.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initWhatsApp, getStatus, getQRCode, sendMessage, sendBulkMessages, disconnect, restart } = require('./whatsapp');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'default-key';

// Middleware
app.use(cors());
app.use(express.json());

// Localhost-only security (before routes)
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
  if (!isLocal) {
    console.warn(`Blocked external access attempt from: ${ip}`);
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
});

// API Key Authentication
const authenticate = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get QR Code for login
app.get('/api/qr', authenticate, async (req, res) => {
  try {
    const qrData = await getQRCode();
    res.json(qrData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get connection status
app.get('/api/status', authenticate, async (req, res) => {
  try {
    const status = await getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart WhatsApp client
app.post('/api/restart', authenticate, async (req, res) => {
  try {
    const result = await restart();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send single message
app.post('/api/send', authenticate, async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }
    
    const result = await sendMessage(phone, message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send bulk messages
app.post('/api/bulk-send', authenticate, async (req, res) => {
  try {
    const { messages, delayMs = 3000 } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    for (const msg of messages) {
      if (!msg.phone || !msg.message) {
        return res.status(400).json({ error: 'Each message must have phone and message fields' });
      }
    }
    
    const result = await sendBulkMessages(messages, delayMs);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Disconnect WhatsApp
app.post('/api/disconnect', authenticate, async (req, res) => {
  try {
    await disconnect();
    res.json({ success: true, message: 'Disconnected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize WhatsApp client
initWhatsApp();

// Start server - bind to localhost only (not accessible from internet)
app.listen(PORT, '127.0.0.1', () => {
  console.log(`WhatsApp Service running on http://127.0.0.1:${PORT} (localhost only)`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
});
