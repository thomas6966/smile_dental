const { InlineKeyboard, Keyboard } = require('grammy');
const bot = require('../core/bot');
const config = require('../config/default');
const { prisma } = require('../database/connection');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const Notification = require('../models/Notification');
const catalog = require('../services/catalog');
const notify = require('../services/notify');
const { uz, ru, getLocale, pick, formatDate, money, LANGUAGE_PROMPT, LANGUAGE_BUTTONS } = require('../locales');
const { escapeHtml, groupDigits } = require('../utils/format');
const { formatPhone } = require('../utils/phone');

const MENU_BUTTON_TEXT = '🦷 Klinika';
const MAX_MESSAGE = 4000;

// Baho qo'yilgandan keyin fikr kutilayotgan foydalanuvchilar
const feedbackWaiting = new Map();

async function getUser(ctx) {
  const { user } = await User.findOrCreateFromTelegram(ctx.from);
  return user;
}

const clip = (text, max = 300) => (text && text.length > max ? `${text.slice(0, max - 1)}…` : text);

function fit(blocks, header, footer = '') {
  let body = '';
  for (const block of blocks) {
    const next = body ? `${body}\n\n${block}` : block;
    if (header.length + next.length + footer.length + 4 > MAX_MESSAGE) break;
    body = next;
  }
  return [header, '', body, footer ? `\n${footer}` : ''].join('\n').trim();
}

function mainKeyboard(L) {
  return new Keyboard()
    .text(L.menu.book)
    .row()
    .text(L.menu.appointments)
    .text(L.menu.history)
    .row()
    .text(L.menu.services)
    .text(L.menu.doctors)
    .row()
    .text(L.menu.contacts)
    .text(L.menu.language)
    .resized()
    .persistent();
}

function languageKeyboard() {
  const keyboard = new InlineKeyboard();
  LANGUAGE_BUTTONS.forEach((b) => keyboard.text(b.label, `lang:${b.code}`));
  return keyboard;
}

function priceText(L, service) {
  const current = money(L, service.price, service.priceFrom);
  if (service.oldPrice && service.oldPrice > service.price) {
    return `<s>${groupDigits(service.oldPrice)}</s> <b>${current}</b>`;
  }
  return current;
}

function socialUrl(value, type) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '');
  return type === 'instagram' ? `https://instagram.com/${handle}` : `https://t.me/${handle}`;
}

async function sendMainMenu(ctx, user, { welcome = false } = {}) {
  const L = getLocale(user.language);
  const clinic = await Clinic.get();
  const text = welcome ? L.welcome(escapeHtml(user.firstName), escapeHtml(clinic?.name || '')) : L.menuHint;
  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: mainKeyboard(L) });

  const url = notify.webAppUrl();
  if (welcome && url) {
    await ctx.reply(L.openAppHint, { reply_markup: new InlineKeyboard().webApp(L.btn.openApp, url) });
  }
}

function askPhone(ctx, user) {
  const L = getLocale(user.language);
  return ctx.reply(L.askPhone(escapeHtml(user.firstName)), {
    parse_mode: 'HTML',
    reply_markup: new Keyboard().requestContact(L.sharePhoneBtn).resized().oneTime(),
  });
}

// ---------------- Buyruqlar ----------------

exports.start = async (ctx) => {
  const user = await getUser(ctx);
  if (!user.phone) {
    return ctx.reply(LANGUAGE_PROMPT, { reply_markup: languageKeyboard() });
  }
  return sendMainMenu(ctx, user, { welcome: true });
};

exports.menu = async (ctx) => {
  const user = await getUser(ctx);
  if (!user.phone) return askPhone(ctx, user);
  return sendMainMenu(ctx, user);
};

exports.askLanguage = async (ctx) => {
  await getUser(ctx);
  return ctx.reply(LANGUAGE_PROMPT, { reply_markup: languageKeyboard() });
};

exports.setLanguage = async (ctx) => {
  const lang = ctx.match[1];
  await getUser(ctx);
  const user = await User.setLanguage(ctx.from.id, lang);
  const L = getLocale(lang);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(L.languageChosen).catch(() => {});

  if (!user.phone) return askPhone(ctx, user);
  return sendMainMenu(ctx, user);
};

exports.contact = async (ctx) => {
  const contact = ctx.message.contact;
  const current = await getUser(ctx);
  const L = getLocale(current.language);

  if (!contact.user_id || contact.user_id !== ctx.from.id) {
    return ctx.reply(L.phoneNotOwn);
  }
  const hadPhone = Boolean(current.phone);
  const user = await User.attachVerifiedPhone(ctx.from, contact.phone_number);
  return sendMainMenu(ctx, user, { welcome: !hadPhone });
};

// ---------------- Menyu bo'limlari ----------------

exports.book = async (ctx) => {
  const user = await getUser(ctx);
  const L = getLocale(user.language);
  const url = notify.webAppUrl('booking');
  if (url) {
    return ctx.reply(L.bookIntro, { reply_markup: new InlineKeyboard().webApp(L.btn.book, url) });
  }
  const clinic = await Clinic.get();
  return ctx.reply(L.noWebApp(escapeHtml(formatPhone(clinic.phone))), { parse_mode: 'HTML' });
};

exports.appointments = async (ctx) => {
  const user = await getUser(ctx);
  const L = getLocale(user.language);
  const list = await prisma.appointment.findMany({
    where: { userId: user.id, status: { in: ['PENDING', 'CONFIRMED'] }, startAt: { gte: new Date() } },
    orderBy: { startAt: 'asc' },
    take: 5,
    include: { doctor: true, service: true },
  });

  if (!list.length) {
    const url = notify.webAppUrl('booking');
    return ctx.reply(L.noUpcoming, url ? { reply_markup: new InlineKeyboard().webApp(L.btn.book, url) } : {});
  }

  const blocks = list.map(
    (a, i) => `<b>${i + 1}.</b> ${notify.appointmentLines(L, a)}\n${L.labels.status}: ${L.status[a.status]}`,
  );
  const keyboard = new InlineKeyboard();
  list.forEach((a, i) => {
    keyboard.text(`❌ ${i + 1}. ${formatDate(L, a.date, { withWeekday: false })}, ${a.startTime}`, `cancel:${a.id}`).row();
  });
  const url = notify.webAppUrl('appointments');
  if (url) keyboard.webApp(L.btn.openApp, url);

  return ctx.reply(fit(blocks, L.upcomingTitle), { parse_mode: 'HTML', reply_markup: keyboard });
};

exports.history = async (ctx) => {
  const user = await getUser(ctx);
  const L = getLocale(user.language);
  const list = await prisma.appointment.findMany({
    where: { userId: user.id, status: 'COMPLETED' },
    orderBy: { startAt: 'desc' },
    take: 10,
    include: { doctor: true, service: true },
  });
  if (!list.length) return ctx.reply(L.noHistory);

  const blocks = list.map((a) => {
    const title = a.service ? pick(a.service, 'name', L.code) : L.labels.consultation;
    const lines = [
      `✅ <b>${formatDate(L, a.date, { withWeekday: false })}</b> — ${escapeHtml(title)}`,
      `${L.labels.doctor}: ${escapeHtml(a.doctor.fullName)}`,
    ];
    if (a.diagnosis) lines.push(`${L.labels.diagnosis}: ${escapeHtml(clip(a.diagnosis))}`);
    if (a.recommendation) lines.push(`${L.labels.recommendation}: ${escapeHtml(clip(a.recommendation))}`);
    if (a.price) lines.push(`${L.labels.price}: ${money(L, a.price)}`);
    return lines.join('\n');
  });

  const url = notify.webAppUrl('history');
  return ctx.reply(fit(blocks, L.historyTitle), {
    parse_mode: 'HTML',
    ...(url ? { reply_markup: new InlineKeyboard().webApp(L.btn.history, url) } : {}),
  });
};

exports.services = async (ctx) => {
  const user = await getUser(ctx);
  const L = getLocale(user.language);
  const { categories, services } = await catalog.get();

  const blocks = [];
  const known = new Set(categories.map((c) => c.id));
  for (const category of categories) {
    const items = services.filter((s) => s.categoryId === category.id);
    if (!items.length) continue;
    const head = `<b>${category.icon ? `${category.icon} ` : ''}${escapeHtml(pick(category, 'name', L.code))}</b>`;
    blocks.push([head, ...items.map((s) => `• ${escapeHtml(pick(s, 'name', L.code))} — ${priceText(L, s)}`)].join('\n'));
  }
  const other = services.filter((s) => !s.categoryId || !known.has(s.categoryId));
  if (other.length) {
    blocks.push(other.map((s) => `• ${escapeHtml(pick(s, 'name', L.code))} — ${priceText(L, s)}`).join('\n'));
  }

  const url = notify.webAppUrl('booking');
  return ctx.reply(fit(blocks, L.servicesTitle, L.servicesNote), {
    parse_mode: 'HTML',
    ...(url ? { reply_markup: new InlineKeyboard().webApp(L.btn.book, url) } : {}),
  });
};

exports.doctors = async (ctx) => {
  const user = await getUser(ctx);
  const L = getLocale(user.language);
  const { doctors } = await catalog.get();

  const blocks = doctors.map((d) => {
    const meta = [L.experience(d.experienceYears)];
    if (d.rating) meta.push(L.reviews(d.rating, d.ratingCount));
    return `👨‍⚕️ <b>${escapeHtml(d.fullName)}</b>\n${escapeHtml(pick(d, 'specialty', L.code))}\n${meta.join(' · ')}`;
  });

  const url = notify.webAppUrl('booking');
  return ctx.reply(fit(blocks, L.doctorsTitle), {
    parse_mode: 'HTML',
    ...(url ? { reply_markup: new InlineKeyboard().webApp(L.btn.book, url) } : {}),
  });
};

exports.contacts = async (ctx) => {
  const user = await getUser(ctx);
  const L = getLocale(user.language);
  const clinic = await Clinic.get();

  const lines = [`🏥 <b>${escapeHtml(clinic.name)}</b>`, ''];
  lines.push(`${L.labels.address}: ${escapeHtml(pick(clinic, 'address', L.code))}`);
  const landmark = pick(clinic, 'landmark', L.code);
  if (landmark) lines.push(`${L.labels.landmark}: ${escapeHtml(landmark)}`);
  const phones = [clinic.phone, clinic.phone2].filter(Boolean).map((p) => escapeHtml(formatPhone(p)));
  lines.push(`${L.labels.phone}: ${phones.join(', ')}`);
  lines.push(`${L.labels.hours}: ${escapeHtml(pick(clinic, 'workingHours', L.code))}`);

  const keyboard = new InlineKeyboard();
  const mapUrl = Clinic.mapUrl(clinic);
  const instagram = socialUrl(clinic.instagram, 'instagram');
  const telegram = socialUrl(clinic.telegram, 'telegram');
  if (mapUrl) keyboard.url(L.btn.map, mapUrl);
  if (mapUrl && (instagram || telegram)) keyboard.row();
  if (instagram) keyboard.url(L.btn.instagram, instagram);
  if (telegram) keyboard.url(L.btn.telegram, telegram);
  const hasButtons = Boolean(mapUrl || instagram || telegram);

  await ctx.reply(lines.join('\n'), { parse_mode: 'HTML', ...(hasButtons ? { reply_markup: keyboard } : {}) });
  if (clinic.latitude != null && clinic.longitude != null) {
    await ctx.replyWithLocation(clinic.latitude, clinic.longitude).catch(() => {});
  }
};

// ---------------- Inline tugmalar ----------------

async function ownAppointment(ctx, id) {
  const user = await getUser(ctx);
  const appointment = await prisma.appointment.findFirst({
    where: { id, userId: user.id },
    include: { user: true, doctor: true, service: true },
  });
  return { user, appointment, L: getLocale(user.language) };
}

const isActiveFuture = (a) => a && ['PENDING', 'CONFIRMED'].includes(a.status) && a.startAt > new Date();
const removeButtons = (ctx) => ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } }).catch(() => {});

exports.rate = async (ctx) => {
  const id = Number(ctx.match[1]);
  const rating = Number(ctx.match[2]);
  const { appointment, L } = await ownAppointment(ctx, id);
  if (!appointment || appointment.status !== 'COMPLETED') {
    return ctx.answerCallbackQuery({ text: L.notAvailable, show_alert: true });
  }

  const firstTime = appointment.rating == null;
  await prisma.appointment.update({ where: { id }, data: { rating } });
  if (firstTime) await Notification.create('RATED', id);
  catalog.invalidate();

  const stars = '⭐'.repeat(rating);
  await ctx.answerCallbackQuery({ text: L.rateThanks(stars) });
  await removeButtons(ctx);
  await ctx.reply(`${L.rateThanks(stars)}\n\n${L.feedbackAsk}`);
  feedbackWaiting.set(String(ctx.from.id), { appointmentId: id, until: Date.now() + 30 * 60 * 1000 });
};

exports.attend = async (ctx) => {
  const { appointment, L } = await ownAppointment(ctx, Number(ctx.match[1]));
  if (!isActiveFuture(appointment)) {
    await removeButtons(ctx);
    return ctx.answerCallbackQuery({ text: L.notAvailable, show_alert: true });
  }
  if (appointment.status === 'PENDING') {
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: 'CONFIRMED' } });
    await Notification.create('CONFIRMED', appointment.id);
  }
  await ctx.answerCallbackQuery({ text: L.attendThanks });
  await removeButtons(ctx);
  return ctx.reply(L.attendThanks);
};

exports.askCancel = async (ctx) => {
  const { appointment, L } = await ownAppointment(ctx, Number(ctx.match[1]));
  if (!isActiveFuture(appointment)) {
    return ctx.answerCallbackQuery({ text: L.notAvailable, show_alert: true });
  }
  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard()
    .text(L.btn.yesCancel, `cancelyes:${appointment.id}`)
    .text(L.btn.no, `cancelno:${appointment.id}`);
  return ctx.reply(`${L.cancelAsk}\n\n${notify.appointmentLines(L, appointment)}`, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });
};

exports.cancelYes = async (ctx) => {
  const { appointment, L } = await ownAppointment(ctx, Number(ctx.match[1]));
  if (!isActiveFuture(appointment)) {
    await removeButtons(ctx);
    return ctx.answerCallbackQuery({ text: L.notAvailable, show_alert: true });
  }

  const clinic = await Clinic.get();
  if (appointment.startAt.getTime() - Date.now() < clinic.cancelLimitHours * 3600 * 1000) {
    return ctx.answerCallbackQuery({
      text: L.cancelTooLate(clinic.cancelLimitHours, formatPhone(clinic.phone)),
      show_alert: true,
    });
  }

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: 'CANCELLED', cancelledBy: 'PATIENT' },
  });
  await Notification.create('CANCELLED', appointment.id);
  await ctx.answerCallbackQuery();
  await ctx
    .editMessageText(`${L.cancelDone}\n\n${notify.appointmentLines(L, appointment)}`, { parse_mode: 'HTML' })
    .catch(() => {});

  const url = notify.webAppUrl('booking');
  if (url) {
    await ctx.reply(L.notify.cancelledNote, { reply_markup: new InlineKeyboard().webApp(L.btn.rebook, url) });
  }
};

exports.cancelNo = async (ctx) => {
  const user = await getUser(ctx);
  const L = getLocale(user.language);
  await ctx.answerCallbackQuery({ text: L.cancelKept });
  await ctx.deleteMessage().catch(() => removeButtons(ctx));
};

exports.text = async (ctx) => {
  const key = String(ctx.from.id);
  const user = await getUser(ctx);
  const L = getLocale(user.language);
  const waiting = feedbackWaiting.get(key);

  if (waiting && waiting.until > Date.now() && !ctx.message.text.startsWith('/')) {
    feedbackWaiting.delete(key);
    await prisma.appointment.updateMany({
      where: { id: waiting.appointmentId, userId: user.id },
      data: { feedback: ctx.message.text.slice(0, 1000) },
    });
    return ctx.reply(L.feedbackThanks);
  }

  if (!user.phone) return ctx.reply(LANGUAGE_PROMPT, { reply_markup: languageKeyboard() });
  return sendMainMenu(ctx, user);
};

// ---------------- Bot profilini sozlash ----------------

async function syncDescription(clinicName) {
  for (const L of [uz, ru]) {
    const languageCode = L === ru ? 'ru' : undefined;
    const scope = languageCode ? { language_code: languageCode } : {};
    try {
      const current = await bot.api.getMyDescription(scope);
      const description = L.botDescription(clinicName);
      if (current.description !== description) await bot.api.setMyDescription(description, scope);

      const currentShort = await bot.api.getMyShortDescription(scope);
      const short = L.botShortDescription(clinicName);
      if (currentShort.short_description !== short) await bot.api.setMyShortDescription(short, scope);
    } catch (err) {
      console.warn('Bot tavsifini yangilab bo\'lmadi:', err.description || err.message);
    }
  }
}

async function updateMenuButton() {
  const url = notify.webAppUrl();
  await bot.api.setChatMenuButton({
    menu_button: url ? { type: 'web_app', text: MENU_BUTTON_TEXT, web_app: { url } } : { type: 'commands' },
  });
}

exports.updateMenuButton = updateMenuButton;

exports.setupProfile = async () => {
  const me = await bot.api.getMe();
  config.runtime.botUsername = me.username;
  config.runtime.botOk = true;

  await bot.api
    .setMyCommands([
      { command: 'start', description: uz.commands.start },
      { command: 'lang', description: uz.commands.lang },
    ])
    .catch(() => {});
  await bot.api
    .setMyCommands(
      [
        { command: 'start', description: ru.commands.start },
        { command: 'lang', description: ru.commands.lang },
      ],
      { language_code: 'ru' },
    )
    .catch(() => {});

  await updateMenuButton().catch((err) => console.warn("Menyu tugmasini sozlab bo'lmadi:", err.description || err.message));

  const clinic = await Clinic.get();
  if (clinic) await syncDescription(clinic.name);

  return me;
};
