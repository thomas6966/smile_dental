const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const config = require('../config/default');

// Mini App uchun https manzil:
//  1) .env dagi WEBAPP_URL
//  2) NGROK_AUTHTOKEN bo'lsa — ngrok (doimiy domen)
//  3) aks holda — Cloudflare Tunnel (akkaunt shart emas, har ishga tushganda yangi manzil)

let cloudflared = null;
let stopping = false;

const target = () => `http://127.0.0.1:${config.port}`;

function findCloudflared() {
  const exe = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  const candidates = [
    path.join(config.paths.root, 'bin', exe),
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
  ];
  return candidates.find((file) => fs.existsSync(file)) || exe;
}

function runCloudflared() {
  return new Promise((resolve, reject) => {
    const proc = spawn(findCloudflared(), ['tunnel', '--no-autoupdate', '--url', target()], { windowsHide: true });
    cloudflared = proc;

    let url = null;
    let settled = false;
    let grace = null;
    const timeout = setTimeout(() => finish(new Error('Cloudflare tunnel 60 soniyada ulanmadi')), 60000);

    function finish(err, value) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearTimeout(grace);
      if (err) {
        proc.kill();
        reject(err);
      } else {
        resolve({ url: value, proc });
      }
    }

    const onOutput = (chunk) => {
      const text = String(chunk);
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !url) {
        url = match[0].toLowerCase();
        grace = setTimeout(() => finish(null, url), 15000);
      }
      if (url && /Registered tunnel connection/i.test(text)) finish(null, url);
    };

    proc.stdout.on('data', onOutput);
    proc.stderr.on('data', onOutput);
    proc.on('error', (err) => {
      finish(err.code === 'ENOENT' ? new Error('cloudflared dasturi topilmadi (bin/cloudflared.exe)') : err);
    });
    proc.on('exit', (code) => {
      if (cloudflared === proc) cloudflared = null;
      finish(new Error(`cloudflared to'xtadi (kod: ${code})`));
    });
  });
}

async function startCloudflare(onChange) {
  const { url, proc } = await runCloudflared();
  proc.on('exit', () => {
    if (stopping) return;
    console.warn('⚠️  Tunnel uzildi, qayta ulanmoqda...');
    setTimeout(() => restartCloudflare(onChange), 5000);
  });
  return url;
}

async function restartCloudflare(onChange, attempt = 1) {
  if (stopping) return;
  try {
    const url = await startCloudflare(onChange);
    await onChange(url);
  } catch (err) {
    console.error('❌ Tunnel qayta ulanmadi:', err.message);
    setTimeout(() => restartCloudflare(onChange, attempt + 1), Math.min(60000, 5000 * attempt));
  }
}

async function startNgrok() {
  const ngrok = require('@ngrok/ngrok');
  const options = { addr: `127.0.0.1:${config.port}`, authtoken: config.ngrok.authtoken };
  if (config.ngrok.domain) options.domain = config.ngrok.domain;
  const listener = await ngrok.forward(options);
  return String(listener.url() || '').replace(/\/+$/, '');
}

async function resolveWebAppUrl(onChange = async () => {}) {
  if (config.webAppUrl) return config.webAppUrl;
  if (config.tunnel === 'none') return '';

  if (config.ngrok.authtoken && config.tunnel !== 'cloudflare') {
    // Dastur qayta ishga tushganda oldingi ngrok sessiyasi bir necha soniya band turishi mumkin
    const attempts = 4;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await startNgrok();
      } catch (err) {
        if (attempt < attempts) {
          console.warn(`⚠️  ngrok ulanmadi, ${attempt + 1}-urinish... (${err.message})`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          continue;
        }
        if (config.tunnel === 'ngrok') throw err;
        console.warn(`⚠️  ngrok ulanmadi (${err.message}). Cloudflare Tunnel ishlatiladi.`);
      }
    }
  }
  if (config.tunnel === 'ngrok') throw new Error(".env faylida NGROK_AUTHTOKEN ko'rsatilmagan");

  return startCloudflare(onChange);
}

function stop() {
  stopping = true;
  if (cloudflared) {
    try {
      cloudflared.kill();
    } catch {
      // jarayon allaqachon to'xtagan
    }
  }
}

process.on('exit', stop);

module.exports = { resolveWebAppUrl, stop };
