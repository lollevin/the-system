/**
 * WhatsApp Web.js Connection Manager
 *
 * Handles WhatsApp connection, QR code generation, and message sending.
 *
 * Stability notes:
 *  - Pinned webVersion via RemoteAuth-style cache so upstream WhatsApp Web
 *    changes don't silently break the automation selectors.
 *  - Removed `--single-process` (causes random Chromium crashes on VPS).
 *  - All init / puppeteer errors surface through connectionStatus so the UI
 *    can show the real state instead of a forever "Generating QR code...".
 *  - Auto-reinit if we stay in `disconnected` with no QR for > 45s.
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

// State
let client = null;
let currentQR = null;
let qrTimestamp = null;
let connectionStatus = 'initializing';
let lastStatusChangeAt = Date.now();
let lastError = null;
let connectedPhone = null;
let intentionalDisconnect = false;
let reconnectAttempts = 0;
let isRestarting = false;
let initWatchdog = null;
let healthCheckInterval = null;
let consecutiveHealthFailures = 0;
let connectedSince = null;
let lastHealthyAt = null;

const QR_EXPIRY_MS = 20000;
const MAX_RECONNECT_DELAY = 60000;
// If we never produce a QR within this window after init, force a restart.
const INIT_WATCHDOG_MS = 60000;
// Health check: ping WA every 60s once connected. 3 consecutive fails = restart.
const HEALTH_CHECK_INTERVAL_MS = 60000;
const MAX_HEALTH_FAILURES = 3;
// Proactive restart after this many hours of uptime to avoid Chromium memory leak.
const MAX_UPTIME_HOURS = 20;
// Proactive restart if RSS memory exceeds this threshold.
const MAX_RSS_MB = 900;

const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

function setStatus(next, reason) {
  if (connectionStatus !== next) {
    console.log(`[WA] status: ${connectionStatus} -> ${next}${reason ? ` (${reason})` : ''}`);
    connectionStatus = next;
    lastStatusChangeAt = Date.now();
  }
}

function getReconnectDelay() {
  const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;
  return delay;
}

function armInitWatchdog() {
  if (initWatchdog) clearTimeout(initWatchdog);
  initWatchdog = setTimeout(() => {
    if (connectionStatus !== 'connected' && connectionStatus !== 'qr_ready') {
      console.warn('[WA] Init watchdog: no QR in ' + INIT_WATCHDOG_MS + 'ms, restarting client.');
      lastError = 'Init timeout — Chromium/puppeteer never produced a QR';
      restart().catch(err => console.error('[WA] Watchdog restart failed:', err.message));
    }
  }, INIT_WATCHDOG_MS);
}

/**
 * Initialize WhatsApp client
 */
function initWhatsApp() {
  console.log('[WA] Initializing WhatsApp client...');
  setStatus('initializing', 'init called');
  lastError = null;
  currentQR = null;
  qrTimestamp = null;

  try {
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: SESSIONS_DIR,
      }),
      // Pin to a known-good WhatsApp Web build served by wppconnect CDN.
      // This is the single most important stability fix — stops upstream
      // WhatsApp Web pushes from silently breaking qr event emission.
      webVersionCache: {
        type: 'remote',
        remotePath:
          'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1027096273.html',
      },
      puppeteer: {
        headless: process.env.HEADLESS !== 'false',
        // executablePath can be set via PUPPETEER_EXECUTABLE_PATH if the bundled
        // Chromium is missing on the VPS (common: apt install chromium-browser).
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          // NOTE: --single-process REMOVED — causes "Target closed" on Chromium 120+.
        ],
      },
    });
  } catch (err) {
    console.error('[WA] Client construction failed:', err.message);
    lastError = err.message;
    setStatus('init_failed', 'constructor threw');
    return;
  }

  // QR Code event
  client.on('qr', async (qr) => {
    console.log('[WA] QR received at', new Date().toISOString());
    setStatus('qr_ready');
    qrTimestamp = Date.now();
    try {
      currentQR = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error('[WA] QR generation error:', err);
      lastError = err.message;
    }
  });

  client.on('loading_screen', (percent, message) => {
    console.log(`[WA] Loading: ${percent}% ${message}`);
  });

  client.on('change_state', (state) => {
    console.log('[WA] State change:', state);
  });

  // Ready event
  client.on('ready', async () => {
    console.log('[WA] Client ready!');
    setStatus('connected', 'ready event');
    currentQR = null;
    qrTimestamp = null;
    reconnectAttempts = 0;
    lastError = null;
    connectedSince = Date.now();
    lastHealthyAt = Date.now();
    consecutiveHealthFailures = 0;
    if (initWatchdog) {
      clearTimeout(initWatchdog);
      initWatchdog = null;
    }
    try {
      const info = client.info;
      connectedPhone = info?.wid?.user || null;
      console.log('[WA] Connected as:', connectedPhone);
    } catch (err) {
      console.error('[WA] Error getting client info:', err);
    }
    // Start heartbeat health check to catch zombie connections.
    startHealthCheck();
  });

  client.on('authenticated', () => {
    console.log('[WA] Authenticated');
    setStatus('authenticated', 'auth event');
    reconnectAttempts = 0;
  });

  client.on('auth_failure', (msg) => {
    console.error('[WA] Auth failure:', msg);
    lastError = typeof msg === 'string' ? msg : 'Auth failure';
    setStatus('auth_failure', 'auth_failure event');
    currentQR = null;
    qrTimestamp = null;
    // Nuke the (probably corrupted) session and re-init so user can scan again.
    try {
      const sessionPath = path.join(SESSIONS_DIR, 'session');
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log('[WA] Cleared corrupted session');
      }
    } catch (e) {
      console.warn('[WA] Could not clear session:', e.message);
    }
  });

  client.on('disconnected', (reason) => {
    console.log('[WA] Disconnected:', reason);
    setStatus('disconnected', `disconnected: ${reason}`);
    connectedPhone = null;
    currentQR = null;
    qrTimestamp = null;

    if (!intentionalDisconnect) {
      const delay = getReconnectDelay();
      console.log(`[WA] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})...`);
      setTimeout(() => {
        if (intentionalDisconnect) return;
        console.log('[WA] Attempting to reconnect...');
        // Fresh client instance — re-using the old one after disconnect is flaky.
        initWhatsApp();
      }, delay);
    }
  });

  armInitWatchdog();

  client.initialize().catch((err) => {
    console.error('[WA] initialize() rejected:', err.message);
    lastError = err.message;
    setStatus('init_failed', 'initialize rejected');
  });

  // Puppeteer page / browser crash detection — most common cause of
  // "status says connected but messages don't send" zombie state.
  setTimeout(() => {
    try {
      const browser = client?.pupBrowser;
      if (browser && typeof browser.on === 'function') {
        browser.on('disconnected', () => {
          console.error('[WA] Puppeteer browser disconnected — auto-restarting');
          lastError = 'Chromium browser crashed';
          if (!intentionalDisconnect && !isRestarting) {
            restart().catch((e) => console.error('[WA] Auto-restart after browser crash failed:', e.message));
          }
        });
      }
      const page = client?.pupPage;
      if (page && typeof page.on === 'function') {
        page.on('close', () => {
          console.error('[WA] Puppeteer page closed unexpectedly — auto-restarting');
          lastError = 'Chromium page closed';
          if (!intentionalDisconnect && !isRestarting) {
            restart().catch((e) => console.error('[WA] Auto-restart after page close failed:', e.message));
          }
        });
        page.on('error', (err) => {
          console.error('[WA] Puppeteer page error:', err.message);
          lastError = `Page error: ${err.message}`;
        });
      }
    } catch (e) {
      console.warn('[WA] Could not attach puppeteer listeners:', e.message);
    }
  }, 5000);
}

/**
 * Heartbeat health check — runs every minute once connected.
 * Catches zombie connections where connectionStatus says 'connected'
 * but the Chromium page / WA session is actually dead.
 */
function startHealthCheck() {
  if (healthCheckInterval) clearInterval(healthCheckInterval);

  healthCheckInterval = setInterval(async () => {
    if (connectionStatus !== 'connected' || !client) return;
    if (isRestarting || intentionalDisconnect) return;

    try {
      // 1. Uptime-based proactive restart
      const uptimeHours = (Date.now() - (connectedSince || Date.now())) / (1000 * 60 * 60);
      if (uptimeHours > MAX_UPTIME_HOURS) {
        console.warn(`[WA] Proactive restart — uptime ${uptimeHours.toFixed(1)}h exceeds ${MAX_UPTIME_HOURS}h`);
        lastError = 'Proactive restart after long uptime (prevents memory leaks)';
        await restart();
        return;
      }

      // 2. Memory check
      const mem = process.memoryUsage();
      const rssMb = mem.rss / (1024 * 1024);
      if (rssMb > MAX_RSS_MB) {
        console.warn(`[WA] Proactive restart — RSS ${rssMb.toFixed(0)}MB exceeds ${MAX_RSS_MB}MB`);
        lastError = `Proactive restart due to high memory (${rssMb.toFixed(0)}MB)`;
        await restart();
        return;
      }

      // 3. Live ping — call getState(). This is cheap and confirms the WA
      //    page is still responsive. If it fails 3x in a row, restart.
      const state = await Promise.race([
        client.getState(),
        new Promise((_, rej) => setTimeout(() => rej(new Error('getState timeout')), 15000)),
      ]);

      if (state === 'CONNECTED') {
        consecutiveHealthFailures = 0;
        lastHealthyAt = Date.now();
      } else {
        consecutiveHealthFailures++;
        console.warn(`[WA] Health check unhealthy state: ${state} (fail ${consecutiveHealthFailures}/${MAX_HEALTH_FAILURES})`);
        if (consecutiveHealthFailures >= MAX_HEALTH_FAILURES) {
          lastError = `Zombie connection detected (state=${state}) — auto-restart`;
          consecutiveHealthFailures = 0;
          await restart();
        }
      }
    } catch (err) {
      consecutiveHealthFailures++;
      console.warn(`[WA] Health check error: ${err.message} (fail ${consecutiveHealthFailures}/${MAX_HEALTH_FAILURES})`);
      if (consecutiveHealthFailures >= MAX_HEALTH_FAILURES) {
        lastError = `Health check failed ${MAX_HEALTH_FAILURES}× — auto-restart (${err.message})`;
        consecutiveHealthFailures = 0;
        try { await restart(); } catch (e) { console.error('[WA] Auto-restart failed:', e.message); }
      }
    }
  }, HEALTH_CHECK_INTERVAL_MS);
}

function stopHealthCheck() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

/**
 * Get current QR code
 */
async function getQRCode() {
  if (connectionStatus === 'connected') {
    return {
      qr: null,
      status: 'connected',
      connected: true,
      phone: connectedPhone,
      message: 'Already connected',
      qrAge: null,
    };
  }

  if (currentQR && qrTimestamp) {
    const age = Date.now() - qrTimestamp;
    return {
      qr: currentQR,
      status: connectionStatus,
      connected: false,
      message: 'Scan QR code with WhatsApp',
      qrAge: age,
      expiresIn: Math.max(0, QR_EXPIRY_MS - age),
      expired: age > QR_EXPIRY_MS,
    };
  }

  return {
    qr: null,
    status: connectionStatus,
    connected: false,
    message:
      connectionStatus === 'init_failed'
        ? 'WhatsApp client failed to start — restart required'
        : 'Waiting for QR code...',
    error: lastError,
    qrAge: null,
  };
}

/**
 * Get connection status
 */
async function getStatus() {
  const mem = process.memoryUsage();
  return {
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    phone: connectedPhone,
    error: lastError,
    stuckFor: Date.now() - lastStatusChangeAt,
    uptimeMs: connectedSince ? Date.now() - connectedSince : null,
    lastHealthyAt,
    consecutiveHealthFailures,
    memoryRssMb: Math.round(mem.rss / (1024 * 1024)),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Restart WhatsApp client completely (destroy + re-init)
 */
async function restart() {
  if (isRestarting) {
    return { success: false, message: 'Already restarting, please wait...' };
  }

  isRestarting = true;
  console.log('[WA] Restarting client...');

  try {
    stopHealthCheck();
    if (initWatchdog) {
      clearTimeout(initWatchdog);
      initWatchdog = null;
    }

    if (client) {
      intentionalDisconnect = true;
      try {
        await client.destroy();
      } catch (e) {
        console.log('[WA] Destroy error (ok):', e.message);
      }
      client = null;
    }

    connectedPhone = null;
    currentQR = null;
    qrTimestamp = null;
    reconnectAttempts = 0;
    lastError = null;
    setStatus('initializing', 'restart');

    await new Promise((resolve) => setTimeout(resolve, 2000));

    intentionalDisconnect = false;
    initWhatsApp();

    return {
      success: true,
      message: 'WhatsApp client restarted, new QR will appear shortly',
    };
  } catch (err) {
    console.error('[WA] Restart error:', err);
    lastError = err.message;
    return { success: false, message: err.message };
  } finally {
    isRestarting = false;
  }
}

/**
 * Format phone number for WhatsApp
 * Converts Malaysian numbers to international format
 */
function formatPhone(phone) {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '60' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('60') && cleaned.length <= 10) {
    cleaned = '60' + cleaned;
  }
  return cleaned + '@c.us';
}

/**
 * Send a single message
 */
async function sendMessage(phone, message, options = {}) {
  if (connectionStatus !== 'connected') {
    throw new Error('WhatsApp is not connected. Please scan QR code first.');
  }

  // Pre-flight: verify the connection is actually alive (not zombie).
  // This catches the "status says connected but Chromium is dead" case that
  // caused silent failures after 2-3 days of uptime.
  try {
    const state = await Promise.race([
      client.getState(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('getState timeout')), 10000)),
    ]);
    if (state !== 'CONNECTED') {
      lastError = `Zombie connection detected before send (state=${state})`;
      setStatus('disconnected', 'pre-send health check failed');
      // Fire a background restart so next send will work.
      if (!isRestarting) {
        restart().catch((e) => console.error('[WA] Pre-send restart failed:', e.message));
      }
      throw new Error(`WhatsApp client is not in CONNECTED state (${state}). Auto-restart started — please retry in 30-60s.`);
    }
  } catch (healthErr) {
    if (healthErr.message.includes('not in CONNECTED state')) throw healthErr;
    lastError = `Pre-send health check failed: ${healthErr.message}`;
    if (!isRestarting) {
      restart().catch((e) => console.error('[WA] Pre-send restart failed:', e.message));
    }
    throw new Error(`WhatsApp session unresponsive — auto-restart started, please retry in 30-60s. (${healthErr.message})`);
  }

  const formattedPhone = formatPhone(phone);
  const rawDigits = formattedPhone.replace('@c.us', '');
  const {
    imageBase64,
    imageMimeType = 'image/png',
    imageFilename = 'campaign.png',
    imageCaption,
    ctaUrl,
  } = options || {};

  try {
    // CRITICAL: verify the number actually has a WhatsApp account BEFORE sending.
    // Without this, whatsapp-web.js will silently succeed with a messageId for a non-existent
    // chat — the UI will show "Sent!" but the recipient never receives anything.
    let verifiedJid = formattedPhone;
    try {
      const numberId = await client.getNumberId(rawDigits);
      if (!numberId) {
        return {
          success: false,
          phone,
          error: `Number ${rawDigits} is not registered on WhatsApp`,
        };
      }
      verifiedJid = numberId._serialized;
    } catch (lookupErr) {
      // If the check itself fails (e.g., WA Web is mid-sync), fall back to the formatted JID
      // but log so we know. Sending will still fail loudly if the number truly is invalid.
      console.warn('[WA] getNumberId failed for', rawDigits, '-', lookupErr.message);
    }

    const sentIds = [];

    if (imageBase64) {
      const media = new MessageMedia(imageMimeType, imageBase64, imageFilename);
      const mediaResult = await client.sendMessage(verifiedJid, media, {
        caption: imageCaption || message || '',
      });
      sentIds.push(mediaResult?.id?.id);
    } else if (message) {
      const textResult = await client.sendMessage(verifiedJid, message);
      sentIds.push(textResult?.id?.id);
    }

    if (ctaUrl) {
      const ctaResult = await client.sendMessage(verifiedJid, `${ctaUrl}`, {
        linkPreview: true,
      });
      sentIds.push(ctaResult?.id?.id);
    }

    if (sentIds.length === 0) {
      return {
        success: false,
        phone,
        error: 'No content to send (empty message, image, and CTA)',
      };
    }

    return {
      success: true,
      phone,
      messageId: sentIds[0] || null,
      messageIds: sentIds.filter(Boolean),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[WA] sendMessage error:', error.message);
    return {
      success: false,
      phone,
      error: error.message,
    };
  }
}

async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastErr = error;
      if (attempt === maxRetries) break;
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastErr;
}

async function sendBulkMessages(messages, delayMs = 3000) {
  if (connectionStatus !== 'connected') {
    throw new Error('WhatsApp is not connected. Please scan QR code first.');
  }

  const results = [];
  const totalCount = messages.length;

  console.log(`[WA] Bulk send: ${totalCount} messages (delay: ${delayMs}ms)`);

  for (let i = 0; i < messages.length; i++) {
    const {
      phone,
      message,
      customerId,
      imageBase64,
      imageMimeType,
      imageFilename,
      imageCaption,
      ctaUrl,
      ctaLabel,
    } = messages[i];

    try {
      const result = await withRetry(async () => {
        return await sendMessage(phone, message, {
          imageBase64,
          imageMimeType,
          imageFilename,
          imageCaption,
          ctaUrl,
          ctaLabel,
        });
      }, 2, 1000);

      results.push({ ...result, customerId, index: i + 1, total: totalCount });
      console.log(`[WA] Sent ${i + 1}/${totalCount}: ${phone} - ${result.success ? 'OK' : 'FAIL'}`);
    } catch (error) {
      results.push({
        success: false,
        phone,
        customerId,
        error: error.message,
        index: i + 1,
        total: totalCount,
      });
      console.error(`[WA] Failed ${i + 1}/${totalCount}: ${phone} - ${error.message}`);
    }

    if (i < messages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(delayMs, 3000)));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  return {
    total: totalCount,
    success: successCount,
    failed: failCount,
    results,
  };
}

async function disconnect() {
  if (!client) {
    setStatus('disconnected', 'disconnect: no client');
    return;
  }

  stopHealthCheck();
  intentionalDisconnect = true;

  try {
    await client.logout();
  } catch (err) {
    console.log('[WA] Logout failed, trying destroy:', err.message);
    try {
      await client.destroy();
    } catch (err2) {
      console.log('[WA] Destroy also failed:', err2.message);
    }
  }

  setStatus('disconnected', 'disconnect called');
  connectedPhone = null;
  currentQR = null;

  setTimeout(() => {
    intentionalDisconnect = false;
    console.log('[WA] Re-initializing for new login...');
    initWhatsApp();
  }, 3000);
}

module.exports = {
  initWhatsApp,
  getQRCode,
  getStatus,
  sendMessage,
  sendBulkMessages,
  disconnect,
  restart,
};
