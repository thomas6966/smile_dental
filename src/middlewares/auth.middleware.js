const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/default');
const { prisma } = require('../database/connection');

const INIT_DATA_MAX_AGE_SEC = 24 * 3600;

// Telegram Mini App initData imzosini tekshirish
function verifyInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  const secret = crypto.createHmac('sha256', 'WebAppData').update(config.botToken).digest();
  const checkString = (exclude) =>
    [...params.entries()]
      .filter(([key]) => !exclude.includes(key))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

  const valid = [['hash'], ['hash', 'signature']].some((exclude) => {
    const calculated = crypto.createHmac('sha256', secret).update(checkString(exclude)).digest('hex');
    return calculated.length === hash.length && crypto.timingSafeEqual(Buffer.from(calculated), Buffer.from(hash));
  });
  if (!valid) return null;

  const authDate = Number(params.get('auth_date'));
  if (!authDate || Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SEC) return null;

  try {
    return JSON.parse(params.get('user'));
  } catch {
    return null;
  }
}

// ngrok orqali emas, to'g'ridan-to'g'ri kompyuterdan kelgan so'rov
function isLocalRequest(req) {
  return (
    !req.get('x-forwarded-for') &&
    !req.get('cf-connecting-ip') &&
    ['localhost', '127.0.0.1', '::1'].includes(req.hostname)
  );
}

function telegramAuth(req, res, next) {
  const initData = req.get('x-telegram-init-data');
  let tgUser = initData ? verifyInitData(initData) : null;

  if (!tgUser && !initData && config.devAuth && isLocalRequest(req)) {
    tgUser = {
      id: Number(config.devTelegramId),
      first_name: 'Test',
      last_name: 'Foydalanuvchi',
      language_code: 'uz',
    };
  }

  if (!tgUser?.id) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Ilovani Telegram bot orqali oching',
      botUsername: config.runtime.botUsername,
    });
  }
  req.tgUser = tgUser;
  return next();
}

// ---------- Admin ----------
const adminCache = new Map();

async function adminExists(id) {
  const cached = adminCache.get(id);
  if (cached && cached.until > Date.now()) return cached.exists;
  const exists = Boolean(await prisma.admin.findUnique({ where: { id }, select: { id: true } }));
  adminCache.set(id, { exists, until: Date.now() + 60 * 1000 });
  return exists;
}

function forgetAdmin(id) {
  adminCache.delete(id);
}

async function adminAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Tizimga kiring' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessiya muddati tugagan, qayta kiring' });
  }
  if (!(await adminExists(payload.id))) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Hisob topilmadi' });
  }
  req.admin = { id: payload.id, username: payload.username, fullName: payload.fullName };
  return next();
}

// ---------- Login urinishlarini cheklash ----------
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

const attemptKey = (req) =>
  `${req.get('x-forwarded-for') || req.ip}:${String(req.body?.username || '').toLowerCase()}`;

function loginLimiter(req, res, next) {
  const entry = attempts.get(attemptKey(req));
  if (entry && entry.lockedUntil > Date.now()) {
    return res.status(429).json({
      error: 'TOO_MANY_ATTEMPTS',
      message: "Juda ko'p urinish. 5 daqiqadan so'ng qayta urinib ko'ring",
    });
  }
  return next();
}

function loginFailed(req) {
  const key = attemptKey(req);
  const entry = attempts.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.count = 0;
    entry.lockedUntil = Date.now() + LOCK_MS;
  }
  attempts.set(key, entry);
}

function loginSucceeded(req) {
  attempts.delete(attemptKey(req));
}

module.exports = {
  verifyInitData,
  telegramAuth,
  adminAuth,
  forgetAdmin,
  loginLimiter,
  loginFailed,
  loginSucceeded,
};
