// Vercel uchun yig'ish: Mini App — sayt ildizida, Admin Panel — /admin manzilida
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const out = join(root, 'dist-vercel');
const apiUrl = String(process.env.VITE_API_URL || '').trim();

if (!apiUrl) {
  console.error("❌ VITE_API_URL ko'rsatilmagan. Vercel → Settings → Environment Variables bo'limida backend manzilini kiriting.");
  process.exit(1);
}
if (!/^https?:\/\//.test(apiUrl)) {
  console.error(`❌ VITE_API_URL noto'g'ri: "${apiUrl}". Masalan: https://smile-dental-api.onrender.com`);
  process.exit(1);
}

console.log(`🔗 Backend manzili: ${apiUrl}`);
execSync('npm run build -w mini-app', { stdio: 'inherit' });
execSync('npm run build -w admin-panel', { stdio: 'inherit' });

rmSync(out, { recursive: true, force: true });
cpSync(join(root, 'mini-app', 'dist'), out, { recursive: true });
cpSync(join(root, 'admin-panel', 'dist'), join(out, 'admin'), { recursive: true });

if (!existsSync(join(out, 'index.html')) || !existsSync(join(out, 'admin', 'index.html'))) {
  console.error("❌ Yig'ilgan fayllar topilmadi");
  process.exit(1);
}
console.log('✅ dist-vercel tayyor: Mini App → /, Admin Panel → /admin');
