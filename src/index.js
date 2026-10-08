const fs = require('fs');
const path = require('path');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const { webhookCallback } = require('grammy');
const config = require('./config/default');
const { prisma, connect, disconnect } = require('./database/connection');
const bot = require('./core/bot');
const { registerBotRoutes } = require('./routes/bot.routes');
const publicRoutes = require('./routes/public.routes');
const clientRoutes = require('./routes/client.routes');
const adminRoutes = require('./routes/admin.routes');
const botController = require('./controllers/botController');
const scheduler = require('./services/scheduler');
const tunnel = require('./services/tunnel');
const { HttpError } = require('./utils/http');
const { seedIfEmpty } = require('../prisma/seed');

const WEBHOOK_PATH = '/api/telegram/webhook';
const ALLOWED_UPDATES = ['message', 'callback_query'];

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// ---------- CORS: Vercel'dagi Mini App va Admin Panel so'rovlari uchun ----------
const isLocalOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
app.use(
  '/api',
  cors({
    origin: (origin, callback) => callback(null, !origin || isLocalOrigin(origin) || config.corsOrigins.includes(origin)),
    maxAge: 86400,
  }),
);

// ---------- API ----------
fs.mkdirSync(config.paths.uploads, { recursive: true });
app.use('/uploads', express.static(config.paths.uploads, { maxAge: '7d' }));

registerBotRoutes();
if (config.botMode === 'webhook') {
  app.post(
    WEBHOOK_PATH,
    webhookCallback(bot, 'express', {
      secretToken: config.webhookSecret,
      onTimeout: 'return',
      timeoutMilliseconds: 25000,
    }),
  );
}

app.use('/api', publicRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Manzil topilmadi' }));

// ---------- Frontend (Admin Panel va Mini App) ----------
function serveApp(prefix, dir, title, redirectUrl) {
  const indexFile = path.join(dir, 'index.html');
  app.use(
    prefix,
    express.static(dir, {
      index: false,
      setHeaders: (res, file) => {
        // Vite fayl nomlari xeshlangan — bemalol uzoq keshlash mumkin
        if (file.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );
  app.use(prefix, (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (!fs.existsSync(indexFile)) {
      // Serverda (Render) frontend yig'ilmaydi — Vercel'dagi manzilga yo'naltiramiz
      if (redirectUrl) return res.redirect(302, redirectUrl);
      return res
        .status(503)
        .type('html')
        .send(`<h3 style="font-family:sans-serif">${title} hali yig'ilmagan. Terminalda <code>npm run build</code> buyrug'ini bajaring.</h3>`);
    }
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(indexFile);
  });
}

const frontendUrl = config.webAppUrl && new URL(config.webAppUrl).origin !== (config.publicUrl && new URL(config.publicUrl).origin)
  ? config.webAppUrl
  : '';
serveApp('/admin', config.paths.admin, 'Admin Panel', frontendUrl && `${frontendUrl}/admin`);
serveApp('/', config.paths.miniApp, 'Mini App', frontendUrl);

// ---------- Xatolar ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.extra?.code || 'ERROR', message: err.message, ...err.extra });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'BAD_JSON', message: "So'rov noto'g'ri formatda" });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'Rasm hajmi 5 MB dan oshmasligi kerak' });
  }
  if (err.code === 'P2025') return res.status(404).json({ error: 'NOT_FOUND', message: 'Ma\'lumot topilmadi' });
  if (err.code === 'P2002') return res.status(409).json({ error: 'DUPLICATE', message: 'Bunday yozuv allaqachon mavjud' });
  if (err.code === 'P2003') {
    return res.status(409).json({ error: 'IN_USE', message: "Bu ma'lumot boshqa yozuvlarda ishlatilgan" });
  }
  console.error(err);
  return res.status(500).json({ error: 'SERVER_ERROR', message: 'Serverda xatolik yuz berdi' });
});

// ---------- Ishga tushirish ----------
class AlreadyRunningError extends Error {}

// Windows bitta portni ikki dasturga berib yuborishi mumkin, shuning uchun
// boshqa nusxa ishlayotganini to'g'ridan-to'g'ri so'rab tekshiramiz
async function ensureSingleInstance() {
  if (config.botMode === 'webhook') return;
  try {
    const res = await fetch(`http://127.0.0.1:${config.port}/api/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json().catch(() => null);
    if (data?.ok) throw new AlreadyRunningError('Dastur allaqachon ishlab turibdi');
  } catch (err) {
    if (err instanceof AlreadyRunningError) throw err;
    // javob yo'q — boshqa nusxa ishlamayapti
  }
}

// Kompyuterdagi nusxa: bot allaqachon serverda (webhook) ishlayotgan bo'lsa, uni tortib olmaymiz
async function botOwnedElsewhere() {
  if (config.botMode !== 'polling' || config.forcePolling) return null;
  try {
    const info = await bot.api.getWebhookInfo();
    return info.url || null;
  } catch {
    return null;
  }
}

async function startBot() {
  try {
    const me = await botController.setupProfile();
    bot.botInfo = me;

    if (config.botMode === 'webhook') {
      await bot.api.setWebhook(`${config.publicUrl}${WEBHOOK_PATH}`, {
        secret_token: config.webhookSecret,
        allowed_updates: ALLOWED_UPDATES,
      });
      console.log(`🤖 Bot webhook rejimida: ${config.publicUrl}${WEBHOOK_PATH}`);
      return;
    }

    bot.start({ allowed_updates: ALLOWED_UPDATES }).catch((err) => {
      config.runtime.botOk = false;
      console.error("❌ Bot to'xtadi:", err.description || err.message);
    });
  } catch (err) {
    config.runtime.botOk = false;
    console.error("❌ Botga ulanib bo'lmadi (BOT_TOKEN yoki internetni tekshiring):", err.description || err.message);
  }
}

async function main() {
  await ensureSingleInstance();
  console.log('⏳ Ma\'lumotlar bazasiga ulanilmoqda...');
  await connect();
  const seeded = await seedIfEmpty();
  if (seeded) console.log('🌱 Bazaga namuna ma\'lumotlar yozildi');
  // Bir nechta ulanishni oldindan ochib qo'yamiz — birinchi so'rovlar tezroq ishlaydi
  await Promise.all([
    prisma.broadcast.updateMany({ where: { status: 'SENDING' }, data: { status: 'DONE' } }),
    ...Array.from({ length: 6 }, () => prisma.$queryRaw`SELECT 1`),
  ]);

  await new Promise((resolve, reject) => {
    const server = app.listen(config.port, config.host, resolve);
    server.on('error', reject);
  });

  const remoteWebhook = await botOwnedElsewhere();
  config.runtime.ownsBot = !remoteWebhook;

  if (config.runtime.ownsBot) {
    try {
      if (config.botMode === 'polling') console.log('⏳ Telegram uchun https manzil ochilmoqda...');
      config.runtime.webAppUrl = await tunnel.resolveWebAppUrl(async (url) => {
        config.runtime.webAppUrl = url;
        console.log(`🌐 Mini App yangi manzilga ulandi: ${url}`);
        await botController.updateMenuButton().catch(() => {});
      });
    } catch (err) {
      console.error('❌ Mini App uchun tunnel ochilmadi:', err.message);
    }
    await startBot();
    scheduler.start();
  }

  const line = '─'.repeat(58);
  console.log(`\n${line}`);
  if (config.botMode === 'webhook') {
    console.log(`🚀  Server ishga tushdi: ${config.publicUrl}`);
    console.log(`🦷  Mini App: ${config.runtime.webAppUrl || '— (WEBAPP_URL kiritilmagan)'}`);
  } else {
    console.log(`🦷  Mini App (brauzerda test):  http://localhost:${config.port}`);
    console.log(`🛠   Admin Panel:                http://localhost:${config.port}/admin`);
    if (remoteWebhook) {
      console.log(`ℹ️   Bot boshqa serverda ishlayapti (${remoteWebhook}).`);
      console.log('    Bu kompyuterda bot va eslatmalar ishga tushirilmadi — ikki joyda bir vaqtda ishlamasligi uchun.');
    } else {
      if (config.runtime.botUsername) console.log(`🤖  Telegram bot:               https://t.me/${config.runtime.botUsername}`);
      if (config.runtime.webAppUrl) {
        console.log(`🌐  Mini App (Telegram uchun):  ${config.runtime.webAppUrl}`);
        console.log("✅  Hammasi ishlayapti. Bu oynani yopmang — yopilsa bot to'xtaydi.");
      } else {
        console.log("⚠️   Mini App Telegram'ga ulanmadi: internetni tekshirib, dasturni qayta ishga tushiring");
      }
    }
  }
  console.log(`${line}\n`);
}

async function shutdown() {
  console.log('\n⏹  To\'xtatilmoqda...');
  tunnel.stop();
  if (config.botMode === 'polling' && config.runtime.ownsBot) {
    try {
      await bot.stop();
    } catch {
      // bot ishga tushmagan bo'lishi mumkin
    }
  }
  await disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch(async (err) => {
  // Chiqish kodlari: 2 — dastur allaqachon ishlab turibdi, 1 — boshqa xatolik (start.bat qayta urinadi)
  const alreadyRunning = err instanceof AlreadyRunningError || err.code === 'EADDRINUSE';
  if (alreadyRunning) {
    console.error('ℹ️  Dastur allaqachon ishlab turibdi — ikkinchi nusxa ochilmaydi.');
  } else {
    console.error('❌ Ishga tushirishda xatolik:', err.message);
  }
  await disconnect().catch(() => {});
  process.exit(alreadyRunning ? 2 : 1);
});
