const { InlineKeyboard } = require('grammy');
const bot = require('../core/bot');
const config = require('../config/default');
const { prisma } = require('../database/connection');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const { getLocale, pick, formatDate, relativeDay, money } = require('../locales');
const { escapeHtml } = require('../utils/format');
const { formatPhone } = require('../utils/phone');

function webAppUrl(page, params = {}) {
  const base = config.runtime.webAppUrl;
  if (!base || !base.startsWith('https://')) return null;
  const query = new URLSearchParams({ ...(page ? { page } : {}), ...params }).toString();
  return query ? `${base}/?${query}` : `${base}/`;
}

function isUnreachable(err) {
  const code = err?.error_code;
  const description = err?.description || '';
  return code === 403 || (code === 400 && /chat not found|user is deactivated|PEER_ID_INVALID/i.test(description));
}

async function send(user, text, extra = {}) {
  if (!user?.telegramId || user.isBlocked) return false;
  try {
    await bot.api.sendMessage(user.telegramId, text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...extra,
    });
    return true;
  } catch (err) {
    if (isUnreachable(err)) {
      await User.markBlocked(user.telegramId).catch(() => {});
    } else {
      console.error(`Xabar yuborilmadi (${user.telegramId}):`, err.description || err.message);
    }
    return false;
  }
}

async function sendPlain(user, text) {
  if (!user?.telegramId || user.isBlocked) return false;
  try {
    await bot.api.sendMessage(user.telegramId, text, { link_preview_options: { is_disabled: true } });
    return true;
  } catch (err) {
    if (isUnreachable(err)) await User.markBlocked(user.telegramId).catch(() => {});
    return false;
  }
}

function appointmentLines(L, a, clinic = null) {
  const lines = [
    `${L.labels.date}: <b>${formatDate(L, a.date)}</b>`,
    `${L.labels.time}: <b>${a.startTime}</b>`,
    `${L.labels.doctor}: ${escapeHtml(a.doctor?.fullName || '')}`,
  ];
  if (a.service) lines.push(`${L.labels.service}: ${escapeHtml(pick(a.service, 'name', L.code))}`);
  if (clinic) lines.push(`${L.labels.address}: ${escapeHtml(pick(clinic, 'address', L.code))}`);
  return lines.join('\n');
}

async function withRelations(appointment) {
  if (appointment?.user && appointment?.doctor && appointment.service !== undefined) return appointment;
  const id = typeof appointment === 'object' ? appointment.id : appointment;
  return prisma.appointment.findUnique({ where: { id }, include: { user: true, doctor: true, service: true } });
}

function bookButton(L, label = L.btn.book) {
  const url = webAppUrl('booking');
  return url ? new InlineKeyboard().webApp(label, url) : undefined;
}

async function bookingCreated(appointment, { byAdmin = false } = {}) {
  const a = await withRelations(appointment);
  if (!a?.user?.telegramId) return;
  const L = getLocale(a.user.language);
  const clinic = await Clinic.get();

  const parts = [
    byAdmin ? L.notify.createdByAdmin : L.notify.created,
    '',
    appointmentLines(L, a, clinic),
    '',
    `${L.labels.status}: ${L.status[a.status]}`,
  ];
  if (a.status === 'PENDING') parts.push(L.notify.pendingNote);
  parts.push('', L.notify.remindNote);

  const keyboard = new InlineKeyboard();
  const url = webAppUrl('appointments');
  if (url) keyboard.webApp(L.btn.myAppointments, url).row();
  keyboard.text(L.btn.cancel, `cancel:${a.id}`);

  await send(a.user, parts.join('\n'), { reply_markup: keyboard });
}

async function confirmed(appointment) {
  const a = await withRelations(appointment);
  if (!a?.user?.telegramId) return;
  const L = getLocale(a.user.language);
  const clinic = await Clinic.get();
  const text = [L.notify.confirmed, '', appointmentLines(L, a, clinic), '', L.notify.confirmedNote].join('\n');
  const keyboard = new InlineKeyboard().text(L.btn.cancel, `cancel:${a.id}`);
  await send(a.user, text, { reply_markup: keyboard });
}

async function cancelledByAdmin(appointment) {
  const a = await withRelations(appointment);
  if (!a?.user?.telegramId) return;
  const L = getLocale(a.user.language);
  const parts = [L.notify.cancelledByAdmin, '', appointmentLines(L, a)];
  if (a.cancelReason) parts.push(`${L.labels.reason}: ${escapeHtml(a.cancelReason)}`);
  parts.push('', L.notify.cancelledNote);
  await send(a.user, parts.join('\n'), { reply_markup: bookButton(L, L.btn.rebook) });
}

async function rescheduled(appointment) {
  const a = await withRelations(appointment);
  if (!a?.user?.telegramId) return;
  const L = getLocale(a.user.language);
  const clinic = await Clinic.get();
  const text = [
    L.notify.rescheduled,
    '',
    appointmentLines(L, a, clinic),
    '',
    `${L.labels.status}: ${L.status[a.status]}`,
  ].join('\n');
  const keyboard = new InlineKeyboard();
  const url = webAppUrl('appointments');
  if (url) keyboard.webApp(L.btn.myAppointments, url).row();
  keyboard.text(L.btn.cancel, `cancel:${a.id}`);
  await send(a.user, text, { reply_markup: keyboard });
}

async function reminderDay(appointment) {
  const a = await withRelations(appointment);
  if (!a?.user?.telegramId) return false;
  const L = getLocale(a.user.language);
  const clinic = await Clinic.get();
  const text = [
    L.notify.reminderDay(relativeDay(L, a.date)),
    '',
    appointmentLines(L, a, clinic),
    '',
    L.notify.reminderDayNote,
  ].join('\n');
  const keyboard = new InlineKeyboard().text(L.btn.attend, `attend:${a.id}`).text(L.btn.cancel, `cancel:${a.id}`);
  return send(a.user, text, { reply_markup: keyboard });
}

async function reminderHour(appointment) {
  const a = await withRelations(appointment);
  if (!a?.user?.telegramId) return false;
  const L = getLocale(a.user.language);
  const clinic = await Clinic.get();
  const text = [L.notify.reminderHour, '', appointmentLines(L, a, clinic), '', L.notify.reminderHourNote].join('\n');
  const mapUrl = Clinic.mapUrl(clinic);
  const extra = mapUrl ? { reply_markup: new InlineKeyboard().url(L.btn.map, mapUrl) } : {};
  return send(a.user, text, extra);
}

async function completed(appointment) {
  const a = await withRelations(appointment);
  if (!a?.user?.telegramId) return;
  const L = getLocale(a.user.language);

  const parts = [L.notify.completed(escapeHtml(User.displayName(a.user))), ''];
  parts.push(`${L.labels.doctor}: ${escapeHtml(a.doctor?.fullName || '')}`);
  if (a.service) parts.push(`${L.labels.service}: ${escapeHtml(pick(a.service, 'name', L.code))}`);
  if (a.diagnosis) parts.push(`${L.labels.diagnosis}: ${escapeHtml(a.diagnosis)}`);
  if (a.recommendation) parts.push(`${L.labels.recommendation}: ${escapeHtml(a.recommendation)}`);
  if (a.price) parts.push(`${L.labels.price}: ${money(L, a.price)}`);

  const aftercare = a.service ? pick(a.service, 'aftercare', L.code) : '';
  if (aftercare) parts.push('', L.notify.aftercare, escapeHtml(aftercare));
  parts.push('', L.notify.rateAsk);

  const keyboard = new InlineKeyboard();
  for (let n = 1; n <= 5; n += 1) keyboard.text(`${n} ⭐`, `rate:${a.id}:${n}`);
  await send(a.user, parts.join('\n'), { reply_markup: keyboard });
}

async function checkupReminder(user, { months = null } = {}) {
  const L = getLocale(user.language);
  const clinic = await Clinic.get();
  const name = escapeHtml(User.displayName(user));
  const tip = L.tips[Math.floor(Math.random() * L.tips.length)];

  const parts = [
    L.notify.checkupTitle,
    '',
    months ? L.notify.checkupSince(name, months) : L.notify.checkupGeneric(name),
    L.notify.checkupWhy,
    '',
    L.notify.tipTitle,
    tip,
    '',
  ];
  const keyboard = bookButton(L, L.btn.bookCheckup);
  if (keyboard) parts.push(L.notify.checkupCta);
  else parts.push(`${L.labels.phone}: <b>${escapeHtml(formatPhone(clinic.phone))}</b>`);

  return send(user, parts.join('\n'), keyboard ? { reply_markup: keyboard } : {});
}

async function customMessage(user, text) {
  const L = getLocale(user.language);
  const clinic = await Clinic.get();
  return send(user, `${L.notify.fromClinic(escapeHtml(clinic.name))}\n\n${escapeHtml(text)}`);
}

module.exports = {
  webAppUrl,
  send,
  sendPlain,
  appointmentLines,
  bookingCreated,
  confirmed,
  cancelledByAdmin,
  rescheduled,
  reminderDay,
  reminderHour,
  completed,
  checkupReminder,
  customMessage,
};
