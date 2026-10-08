const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '../..');
const envPath = path.join(root, '.env');

if (fs.existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.warn(`.env faylini o'qib bo'lmadi: ${err.message}`);
  }
}

const env = (key, def = '') => String(process.env[key] ?? def).trim();
const bool = (key, def = false) => {
  const value = env(key).toLowerCase();
  if (!value) return def;
  return ['1', 'true', 'yes', 'on'].includes(value);
};
const noSlash = (value) => value.replace(/\/+$/, '');
const originOf = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return '';
  }
};

// Render.com serverida ishlayaptimi (Render bu o'zgaruvchilarni o'zi qo'yadi)
const onRender = Boolean(process.env.RENDER);
const botToken = env('BOT_TOKEN');
const webAppUrl = noSlash(env('WEBAPP_URL'));
const publicUrl = noSlash(env('PUBLIC_URL') || env('RENDER_EXTERNAL_URL'));
const botMode = ['webhook', 'polling'].includes(env('BOT_MODE').toLowerCase())
  ? env('BOT_MODE').toLowerCase()
  : publicUrl
    ? 'webhook'
    : 'polling';

const config = {
  env: env('NODE_ENV', 'development'),
  port: Number(env('PORT', '4000')) || 4000,
  host: env('HOST', onRender ? '0.0.0.0' : '127.0.0.1'),
  botToken,
  webAppUrl,
  publicUrl,
  // webhook — server internetda (Render), polling — kompyuterda ishlaganda
  botMode,
  forcePolling: bool('FORCE_POLLING', false),
  webhookSecret: env('WEBHOOK_SECRET') || crypto.createHash('sha256').update(`webhook:${botToken}`).digest('hex').slice(0, 40),
  corsOrigins: [
    ...env('CORS_ORIGINS')
      .split(',')
      .map((item) => originOf(item.trim()))
      .filter(Boolean),
    originOf(webAppUrl),
  ].filter(Boolean),
  tunnel: ['auto', 'cloudflare', 'ngrok', 'none'].includes(env('TUNNEL').toLowerCase()) ? env('TUNNEL').toLowerCase() : 'auto',
  ngrok: {
    authtoken: env('NGROK_AUTHTOKEN'),
    domain: env('NGROK_DOMAIN').replace(/^https?:\/\//, '').replace(/\/+$/, ''),
  },
  admin: {
    username: env('ADMIN_USERNAME', 'admin'),
    password: env('ADMIN_PASSWORD', 'admin123'),
  },
  jwtSecret: env('JWT_SECRET') || 'dental-clinic-secret',
  tzOffset: Number(env('TIMEZONE_OFFSET', '5')) || 0,
  devAuth: bool('DEV_AUTH', false),
  devTelegramId: env('DEV_TELEGRAM_ID', '100000001'),
  paths: {
    root,
    uploads: path.join(root, 'uploads'),
    miniApp: path.join(root, 'mini-app', 'dist'),
    admin: path.join(root, 'admin-panel', 'dist'),
  },
  // Ishga tushganda to'ldiriladi
  runtime: {
    webAppUrl: '',
    botUsername: '',
    botOk: false,
    ownsBot: true,
  },
};

module.exports = config;
