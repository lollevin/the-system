/**
 * WhatsApp Web.js Connection Manager
 * 
 * Handles WhatsApp connection, QR code generation, and message sending.
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');

// State
let client = null;
let currentQR = null;
let qrTimestamp = null;
let connectionStatus = 'disconnected';
let connectedPhone = null;
let intentionalDisconnect = false;
let reconnectAttempts = 0;
let isRestarting = false;

const QR_EXPIRY_MS = 20000;
const MAX_RECONNECT_DELAY = 60000;

function getReconnectDelay() {
  const delay = Math.min(5000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
  reconnectAttempts++;
  return delay;
}

/**
 * Initialize WhatsApp client
 */
function initWhatsApp() {
  console.log('Initializing WhatsApp client...');
  
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(__dirname, '..', 'sessions')
    }),
    puppeteer: {
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--disable-extensions'
      ]
    }
  });

  // QR Code event
  client.on('qr', async (qr) => {
    console.log('QR Code received at', new Date().toISOString());
    connectionStatus = 'qr_ready';
    qrTimestamp = Date.now();
    
    try {
      currentQR = await qrcode.toDataURL(qr);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  });

  // Ready event
  client.on('ready', async () => {
    console.log('WhatsApp client is ready!');
    connectionStatus = 'connected';
    currentQR = null;
    qrTimestamp = null;
    reconnectAttempts = 0;
    
    try {
      const info = client.info;
      connectedPhone = info.wid.user;
      console.log('Connected as:', connectedPhone);
    } catch (err) {
      console.error('Error getting client info:', err);
    }
  });

  // Authenticated event
  client.on('authenticated', () => {
    console.log('WhatsApp authenticated');
    connectionStatus = 'connecting';
    reconnectAttempts = 0;
  });

  // Auth failure event
  client.on('auth_failure', (msg) => {
    console.error('Authentication failure:', msg);
    connectionStatus = 'disconnected';
    currentQR = null;
    qrTimestamp = null;
  });

  // Disconnected event
  client.on('disconnected', (reason) => {
    console.log('WhatsApp disconnected:', reason);
    connectionStatus = 'disconnected';
    connectedPhone = null;
    currentQR = null;
    qrTimestamp = null;
    
    if (!intentionalDisconnect) {
      const delay = getReconnectDelay();
      console.log(`Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts})...`);
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        client.initialize().catch(err => {
          console.error('Reconnect failed:', err.message);
        });
      }, delay);
    }
  });

  client.initialize().catch(err => {
    console.error('Initial connection failed:', err.message);
    connectionStatus = 'disconnected';
  });
}

/**
 * Get current QR code
 * Always returns latest QR even if possibly expired -
 * whatsapp-web.js auto-emits new QR every ~20s.
 */
async function getQRCode() {
  if (connectionStatus === 'connected') {
    return { 
      qr: null, 
      status: 'connected',
      phone: connectedPhone,
      message: 'Already connected',
      qrAge: null
    };
  }
  
  if (currentQR && qrTimestamp) {
    const age = Date.now() - qrTimestamp;
    return { 
      qr: currentQR, 
      status: connectionStatus,
      message: 'Scan QR code with WhatsApp',
      qrAge: age,
      expiresIn: Math.max(0, QR_EXPIRY_MS - age),
      expired: age > QR_EXPIRY_MS
    };
  }
  
  return { 
    qr: null, 
    status: connectionStatus,
    message: 'Waiting for QR code...',
    qrAge: null
  };
}

/**
 * Get connection status
 */
async function getStatus() {
  return {
    status: connectionStatus,
    connected: connectionStatus === 'connected',
    phone: connectedPhone,
    timestamp: new Date().toISOString()
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
  console.log('Restarting WhatsApp client...');

  try {
    if (client) {
      intentionalDisconnect = true;
      try { await client.destroy(); } catch (e) { console.log('Destroy error (ok):', e.message); }
      client = null;
    }

    connectionStatus = 'disconnected';
    connectedPhone = null;
    currentQR = null;
    qrTimestamp = null;
    reconnectAttempts = 0;

    await new Promise(resolve => setTimeout(resolve, 2000));

    intentionalDisconnect = false;
    initWhatsApp();

    return { success: true, message: 'WhatsApp client restarted, new QR will appear shortly' };
  } catch (err) {
    console.error('Restart error:', err);
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
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Malaysian number starting with 0
  if (cleaned.startsWith('0')) {
    cleaned = '60' + cleaned.substring(1);
  }
  
  // Add Malaysia country code if number is short
  if (!cleaned.startsWith('60') && cleaned.length <= 10) {
    cleaned = '60' + cleaned;
  }
  
  return cleaned + '@c.us';
}

/**
 * Send a single message
 */
async function sendMessage(phone, message) {
  if (connectionStatus !== 'connected') {
    throw new Error('WhatsApp is not connected. Please scan QR code first.');
  }
  
  const formattedPhone = formatPhone(phone);
  
  try {
    const result = await client.sendMessage(formattedPhone, message);
    return {
      success: true,
      phone: phone,
      messageId: result.id.id,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      phone: phone,
      error: error.message
    };
  }
}

/**
 * Send bulk messages with delay
 */
async function sendBulkMessages(messages, delayMs = 3000) {
  if (connectionStatus !== 'connected') {
    throw new Error('WhatsApp is not connected. Please scan QR code first.');
  }
  
  const results = [];
  const totalCount = messages.length;
  
  console.log(`Starting bulk send: ${totalCount} messages`);
  
  for (let i = 0; i < messages.length; i++) {
    const { phone, message, customerId } = messages[i];
    
    try {
      const result = await sendMessage(phone, message);
      results.push({
        ...result,
        customerId,
        index: i + 1,
        total: totalCount
      });
      
      console.log(`Sent ${i + 1}/${totalCount}: ${phone} - ${result.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      results.push({
        success: false,
        phone,
        customerId,
        error: error.message,
        index: i + 1,
        total: totalCount
      });
      console.error(`Failed ${i + 1}/${totalCount}: ${phone} - ${error.message}`);
    }
    
    // Delay between messages (except for the last one)
    if (i < messages.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log(`Bulk send complete: ${successCount} success, ${failCount} failed`);
  
  return {
    total: totalCount,
    success: successCount,
    failed: failCount,
    results
  };
}

/**
 * Disconnect WhatsApp client
 */
async function disconnect() {
  if (!client) {
    connectionStatus = 'disconnected';
    return;
  }
  
  intentionalDisconnect = true;
  
  try {
    // Try logout first (clears session)
    await client.logout();
  } catch (err) {
    console.log('Logout failed, trying destroy:', err.message);
    try {
      // Fallback: destroy the client
      await client.destroy();
    } catch (err2) {
      console.log('Destroy also failed:', err2.message);
    }
  }
  
  connectionStatus = 'disconnected';
  connectedPhone = null;
  currentQR = null;
  
  // Re-initialize after a brief delay so QR code can be scanned again
  setTimeout(() => {
    intentionalDisconnect = false;
    console.log('Re-initializing WhatsApp client for new login...');
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
  restart
};
