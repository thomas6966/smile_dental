# Деплой: Vercel (фронтенд) + Render (backend) + Neon (база)

Схема после деплоя:

```
Телефон пациента ──► Telegram ──► Mini App на Vercel ──► API на Render ──► база Neon
                          ▲                                   │
                          └──────── бот (webhook) ─────────────┘
```

| Часть | Где | Адрес |
|---|---|---|
| Mini App | Vercel | https://smile-dental-rose.vercel.app |
| Админка | Vercel | https://smile-dental-rose.vercel.app/admin |
| Backend + бот | Render | https://smile-dental-api.onrender.com |
| База | Neon | уже работает |

---

## 1. Регистрация на Render

1. Откройте https://render.com и нажмите **Get Started** → **GitHub**.
2. Войдите аккаунтом `thomas6966` и разрешите доступ (Authorize Render).
3. Подтвердите email, если Render попросит.

## 2. Создание сервиса через Blueprint

В репозитории уже лежит файл `render.yaml` — Render прочитает из него все настройки.

1. В панели Render: **New +** → **Blueprint**.
2. Выберите репозиторий **thomas6966/smile_dental**. Если его нет в списке — **Configure account** → дайте Render доступ к репозиторию.
3. Render покажет сервис **smile-dental-api** (план Free, регион Ohio). Нажмите **Apply** / **Deploy Blueprint**.
4. Render попросит ввести секретные переменные. Значения возьмите из файла **`render.env`** в папке проекта на компьютере (откройте Блокнотом):
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `BOT_TOKEN`
   - `ADMIN_PASSWORD`
5. Нажмите **Create** / **Apply**. Первая сборка идёт примерно 3–6 минут.

## 3. Проверка

1. В логах сервиса (вкладка **Logs**) дождитесь строки `🤖 Bot webhook rejimida: ...`.
2. Откройте в браузере: https://smile-dental-api.onrender.com/api/health
   Должно быть: `{"ok":true,"bot":true,"mode":"webhook", ...}`
3. Если адрес сервиса отличается от `smile-dental-api.onrender.com` — сообщите мне: нужно будет поменять адрес API в настройках Vercel и пересобрать фронтенд.

## 4. Выключите локальную версию на компьютере

После деплоя бот живёт на сервере, и программа на ПК больше не нужна.

1. Закройте чёрное окно **«Stomatologiya klinikasi - server»**.
2. Уберите автозапуск: `Win + R` → введите `shell:startup` → удалите ярлык **Stomatologiya klinikasi**.

Если программу на ПК всё-таки запустить, она увидит, что бот работает на сервере, и не будет его перехватывать — бот продолжит работать с Render.

## 5. Чтобы сервер не засыпал

На бесплатном тарифе Render сервис засыпает после 15 минут тишины, а значит, напоминания пациентам не отправятся вовремя.

Решение уже в проекте: GitHub Actions каждые 10 минут отправляет запрос на сервер (файл `.github/workflows/keepalive.yml`). Проверить: GitHub → вкладка **Actions** → **Keep server awake**.

Важно: GitHub отключает такие задачи, если в репозитории 60 дней не было изменений. Тогда достаточно зайти в **Actions** и нажать **Enable workflow**.

---

## Что делать дальше (обслуживание)

| Задача | Как |
|---|---|
| Изменить код | Залить в GitHub — Render и Vercel пересоберут проект автоматически |
| Посмотреть ошибки сервера | Render → сервис → **Logs** |
| Поменять настройки клиники, цены, врачей | Админка: https://smile-dental-rose.vercel.app/admin |
| Сменить пароль админа | Админка → Настройки → Смена пароля |
| Удалить демо-данные перед работой с реальными пациентами | Админка → Настройки → Система |

## Ограничения бесплатных тарифов

- **Render Free:** 750 часов в месяц (хватает на один сервис круглосуточно), 512 МБ памяти, холодный старт после сна ~50 секунд.
- **Vercel Hobby:** только некоммерческое использование, 100 ГБ трафика в месяц.
- **Neon Free:** 0.5 ГБ базы, вычислительные часы ограничены; база засыпает при простое и просыпается за 1–2 секунды.

## Запасной вариант: создать сервис вручную (без Blueprint)

**New +** → **Web Service** → репозиторий `thomas6966/smile_dental` → настройки:

| Поле | Значение |
|---|---|
| Name | `smile-dental-api` |
| Region | Ohio (US East) |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm ci && npx prisma generate && npx prisma migrate deploy` |
| Start Command | `node src/index.js` |
| Instance Type | Free |
| Health Check Path | `/api/health` |

Переменные окружения (кнопка **Add from .env** → вставить содержимое файла `render.env`), плюс добавить отдельно:

```
NODE_VERSION=24
NODE_ENV=production
TIMEZONE_OFFSET=5
DEV_AUTH=false
TUNNEL=none
WEBAPP_URL=https://smile-dental-rose.vercel.app
ADMIN_USERNAME=admin
JWT_SECRET=<любая длинная случайная строка>
```
