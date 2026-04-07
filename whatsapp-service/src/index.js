/**
 * WhatsApp Service - Main Entry Point
 * 
 * This service manages WhatsApp Web.js connection and provides
 * API endpoints for sending messages.
 * 
 * 安全特性:
 * - 频率限制 (Rate Limiting) - 防止账号被封
 * - 指数退避重试 (Exponential Backoff) - 处理网络抖动
 * - 所有 API Key 通过环境变量管理
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initWhatsApp, getStatus, getQRCode, sendMessage, sendBulkMessages, disconnect, restart } = require('./whatsapp');

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || 'default-key';

// ============================================
// 频率限制配置 (Rate Limiting)
// ============================================
const RATE_LIMIT = {
  windowMs: 60 * 1000,           // 1 分钟窗口
  maxRequests: 20,               // 每分钟最多 20 条消息 (WhatsApp 安全阈值)
  maxBurstRequests: 5,           // 瞬时突发最多 5 条
  burstWindowMs: 10 * 1000,      // 10 秒内的突发窗口
};

const rateLimitStore = {
  requests: [],      // 时间戳数组
  burstRequests: [], // 突发请求时间戳
};

function checkRateLimit() {
  const now = Date.now();
  
  // 清理过期的请求记录
  rateLimitStore.requests = rateLimitStore.requests.filter(
    ts => now - ts < RATE_LIMIT.windowMs
  );
  rateLimitStore.burstRequests = rateLimitStore.burstRequests.filter(
    ts => now - ts < RATE_LIMIT.burstWindowMs
  );
  
  // 检查是否超限
  if (rateLimitStore.requests.length >= RATE_LIMIT.maxRequests) {
    const oldestRequest = rateLimitStore.requests[0];
    const retryAfter = Math.ceil((RATE_LIMIT.windowMs - (now - oldestRequest)) / 1000);
    return { allowed: false, reason: 'rate_limit', retryAfter };
  }
  
  if (rateLimitStore.burstRequests.length >= RATE_LIMIT.maxBurstRequests) {
    const oldestBurst = rateLimitStore.burstRequests[0];
    const retryAfter = Math.ceil((RATE_LIMIT.burstWindowMs - (now - oldestBurst)) / 1000);
    return { allowed: false, reason: 'burst_limit', retryAfter };
  }
  
  return { allowed: true };
}

function recordRequest() {
  const now = Date.now();
  rateLimitStore.requests.push(now);
  rateLimitStore.burstRequests.push(now);
}

// 频率限制中间件
function rateLimitMiddleware(req, res, next) {
  const check = checkRateLimit();
  if (!check.allowed) {
    console.warn(`[Rate Limit] Blocked: ${check.reason}, retry after ${check.retryAfter}s`);
    return res.status(429).json({
      error: 'Too many requests',
      reason: check.reason,
      retryAfter: check.retryAfter,
      message: `请等待 ${check.retryAfter} 秒后重试，防止 WhatsApp 账号被封`
    });
  }
  next();
}

// ============================================
// 指数退避重试 (Exponential Backoff)
// ============================================
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) break;
      
      // 计算退避延迟: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 支持大图片

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

// Send single message (with rate limiting and retry)
app.post('/api/send', authenticate, rateLimitMiddleware, async (req, res) => {
  try {
    const {
      phone,
      message,
      imageBase64,
      imageMimeType,
      imageFilename,
      imageCaption,
      ctaUrl,
      ctaLabel,
    } = req.body;
    
    if (!phone || (!message && !imageBase64)) {
      return res.status(400).json({ error: 'Phone and at least one content (message/image) are required' });
    }
    
    // 记录请求（用于频率限制）
    recordRequest();
    
    // 使用指数退避重试发送消息
    const result = await withRetry(async () => {
      return await sendMessage(phone, message, {
        imageBase64,
        imageMimeType,
        imageFilename,
        imageCaption,
        ctaUrl,
        ctaLabel,
      });
    }, 3, 1000);
    
    res.json(result);
  } catch (error) {
    console.error('[Send Error]', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Send bulk messages (with built-in rate limiting via delay)
app.post('/api/bulk-send', authenticate, async (req, res) => {
  try {
    const { messages, delayMs = 3000 } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    for (const msg of messages) {
      if (!msg.phone || (!msg.message && !msg.imageBase64)) {
        return res.status(400).json({ error: 'Each message must have phone and at least one content (message/image)' });
      }
    }
    
    // 批量发送的频率限制：确保每条消息间隔至少 3 秒
    // WhatsApp 建议间隔 3-5 秒以避免被封
    const safeDelayMs = Math.max(delayMs, 3000);
    
    // 检查是否会超过频率限制
    const estimatedTime = messages.length * safeDelayMs / 1000;
    if (messages.length > RATE_LIMIT.maxRequests) {
      console.warn(`[Bulk Send] Large batch: ${messages.length} messages, ~${estimatedTime}s`);
    }
    
    const result = await sendBulkMessages(messages, safeDelayMs);
    
    // 记录所有发送的消息（用于频率限制统计）
    for (let i = 0; i < result.success; i++) {
      recordRequest();
    }
    
    res.json(result);
  } catch (error) {
    console.error('[Bulk Send Error]', error.message);
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

// Rate limit stats (for monitoring)
app.get('/api/rate-limit-stats', authenticate, (req, res) => {
  const now = Date.now();
  const recentRequests = rateLimitStore.requests.filter(
    ts => now - ts < RATE_LIMIT.windowMs
  ).length;
  const recentBurst = rateLimitStore.burstRequests.filter(
    ts => now - ts < RATE_LIMIT.burstWindowMs
  ).length;
  
  res.json({
    currentMinuteRequests: recentRequests,
    maxPerMinute: RATE_LIMIT.maxRequests,
    currentBurstRequests: recentBurst,
    maxBurst: RATE_LIMIT.maxBurstRequests,
    remainingMinute: RATE_LIMIT.maxRequests - recentRequests,
    remainingBurst: RATE_LIMIT.maxBurstRequests - recentBurst,
  });
});

// Initialize WhatsApp client
initWhatsApp();

// Start server - bind to localhost only (not accessible from internet)
app.listen(PORT, '127.0.0.1', () => {
  console.log(`WhatsApp Service running on http://127.0.0.1:${PORT} (localhost only)`);
  console.log(`Health check: http://127.0.0.1:${PORT}/health`);
});
