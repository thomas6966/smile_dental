# 🦷 Stomatologiya klinikasi: Telegram bot + Mini App + Admin Panel

Mijozlar Telegram bot va Mini App orqali shifokor kalendaridan qulay kun va vaqtni tanlab qabulga yoziladi. Klinika xodimlari esa hammasini Admin Paneldan boshqaradi.

## Tarkibi

| Qism | Manzil | Vazifasi |
|---|---|---|
| Backend (API + bot) | `src/` | Express API, Telegram bot (grammY), eslatmalar |
| Mini App (mijozlar) | `mini-app/` → http://localhost:4000 | Onboarding, xizmatlar, yozilish, tarix, profil (UZ/RU) |
| Admin Panel | `admin-panel/` → http://localhost:4000/admin | Dashboard, kalendar, qabullar, bemorlar, xizmatlar, shifokorlar, xabarnoma, sozlamalar |
| Baza | `prisma/schema.prisma` | PostgreSQL (Neon) + Prisma |

## Ishga tushirish

- Kompyuter yoqilganda dastur **avtomatik** ishga tushadi (Windows «Автозагрузка» papkasidagi yorliq orqali).
- Qo'lda: ish stolidagi **«Stomatologiya klinikasi»** yorlig'i yoki `start.bat`.
- Dastur to'xtab qolsa (masalan, internet uzilsa), 15 soniyadan keyin o'zi qayta ishga tushadi.
- Dastur allaqachon ochiq bo'lsa, ikkinchi nusxa ochilmaydi.
- Avtomatik ishga tushishni o'chirish: `Win + R` → `shell:startup` → «Stomatologiya klinikasi» yorlig'ini o'chiring.

Terminal orqali:

```bash
npm install            # paketlarni o'rnatish
npx prisma migrate deploy   # jadvallarni yaratish
npm run seed           # namuna ma'lumotlar (-- --force: hammasini qaytadan yozish)
npm run build          # Mini App va Admin Panelni yig'ish
npm start              # serverni ishga tushirish
```

Yangi kompyuterda hammasini bir marta `setup.bat` qiladi.

## Internetga joylash (deploy)

Mini App va Admin Panel — Vercel'da, backend va bot — Render.com'da, baza — Neon'da. Barcha qadamlar: [DEPLOY.md](DEPLOY.md).

- Mini App: https://smile-dental-rose.vercel.app
- Admin Panel: https://smile-dental-rose.vercel.app/admin
- Backend: https://smile-dental-api.onrender.com

## GitHub'dan yangi kompyuterga o'rnatish

Parol va tokenlar GitHub'ga yuklanmaydi, shuning uchun `.env` faylini qo'lda yaratish kerak.

1. [Node.js LTS](https://nodejs.org) va [Git](https://git-scm.com) o'rnating.
2. Loyihani yuklab oling:
   ```bash
   git clone https://github.com/thomas6966/smile_dental.git
   ```
3. `smile_dental` papkasida `.env.example` faylidan nusxa olib, nomini `.env` qiling va qiymatlarni to'ldiring: `DATABASE_URL`, `DIRECT_URL`, `BOT_TOKEN`, `ADMIN_PASSWORD`, `JWT_SECRET` va (ixtiyoriy) `NGROK_AUTHTOKEN`, `NGROK_DOMAIN`.
4. `setup.bat` ni ishga tushiring, keyin `start.bat` ni.

## Telegram Mini App ulanishi (tunnel)

Dastur ishga tushganda https manzilni o'zi ochadi va bot menyusidagi **🦷 Klinika** tugmasini shu manzilga ulaydi.

- **ngrok** (asosiy): `.env` faylidagi `NGROK_AUTHTOKEN` va `NGROK_DOMAIN` bo'yicha doimiy manzil. Bepul tarifda Mini App birinchi ochilganda ngrok ogohlantirish sahifasi chiqadi — **Visit Site** bosiladi (har bir qurilmada bir marta).
- **Cloudflare Tunnel** (zaxira): ngrok ulanmasa avtomatik ishlaydi, akkaunt shart emas, ogohlantirish sahifasi yo'q. Kamchiligi — har ishga tushganda manzil yangilanadi. Doim shuni ishlatish uchun `.env` da `TUNNEL=cloudflare` qiling.
- Dastur `bin/cloudflared.exe` faylidan foydalanadi (yangi kompyuterda `setup.bat` uni yuklab oladi).

## Admin Panel

- Login va parol `.env` faylidagi `ADMIN_USERNAME` / `ADMIN_PASSWORD` qiymatlari (birinchi ishga tushirishda yaratiladi).
- Parolni **Sozlamalar → Parolni almashtirish** bo'limida o'zgartiring.
- Haqiqiy mijozlar bilan ishlashdan oldin: **Sozlamalar → Tizim → Namuna bemorlar va qabullarni o'chirish**.

## Foydali buyruqlar

| Buyruq | Vazifasi |
|---|---|
| `npm run dev` | Dasturlash rejimi (o'zgarishlar darhol ko'rinadi) |
| `npm run seed -- --force` | Bazani tozalab, namuna ma'lumotlarni qayta yozish |
| `npx prisma studio` | Bazani brauzerda ko'rish |
