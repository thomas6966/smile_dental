const { prisma } = require('../database/connection');
const Clinic = require('../models/Clinic');
const notify = require('./notify');
const { nowLocal, monthsAgo, monthsBetween } = require('../utils/time');

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const running = {};

const include = { user: true, doctor: true, service: true };
const reachable = { telegramId: { not: null }, isBlocked: false };

// Qabuldan 1 kun va 2 soat oldin eslatma
async function appointmentReminders() {
  const clinic = await Clinic.get();
  if (!clinic) return;
  const now = Date.now();
  const base = { status: { in: ['PENDING', 'CONFIRMED'] }, user: reachable };

  if (clinic.remindDayBefore) {
    const list = await prisma.appointment.findMany({
      where: {
        ...base,
        reminderDaySent: false,
        startAt: { gt: new Date(now + 3 * HOUR), lte: new Date(now + 24 * HOUR) },
      },
      include,
      take: 100,
    });
    for (const a of list) {
      const bookedInAdvance = a.startAt.getTime() - a.createdAt.getTime() >= 12 * HOUR;
      if (bookedInAdvance) await notify.reminderDay(a);
      await prisma.appointment.update({ where: { id: a.id }, data: { reminderDaySent: true } });
      await sleep(60);
    }
  }

  if (clinic.remindHoursBefore) {
    const list = await prisma.appointment.findMany({
      where: {
        ...base,
        reminderHourSent: false,
        startAt: { gt: new Date(now), lte: new Date(now + 2 * HOUR) },
      },
      include,
      take: 100,
    });
    for (const a of list) {
      const bookedInAdvance = a.startAt.getTime() - a.createdAt.getTime() >= 3 * HOUR;
      if (bookedInAdvance) await notify.reminderHour(a);
      await prisma.appointment.update({ where: { id: a.id }, data: { reminderHourSent: true } });
      await sleep(60);
    }
  }
}

// Har N oyda profilaktik ko'rik eslatmasi (faqat kunduzi 10:00–20:00)
async function checkupReminders() {
  const clinic = await Clinic.get();
  if (!clinic?.checkupEnabled) return;
  const { hour } = nowLocal();
  if (hour < 10 || hour >= 20) return;

  const cutoff = monthsAgo(clinic.checkupIntervalMonths);
  const users = await prisma.user.findMany({
    where: {
      ...reachable,
      AND: [
        { OR: [{ lastVisitAt: { lte: cutoff } }, { lastVisitAt: null, createdAt: { lte: cutoff } }] },
        { OR: [{ lastCheckupReminderAt: null }, { lastCheckupReminderAt: { lte: cutoff } }] },
      ],
      appointments: { none: { status: { in: ['PENDING', 'CONFIRMED'] }, startAt: { gte: new Date() } } },
    },
    take: 50,
  });

  for (const user of users) {
    const months = user.lastVisitAt ? monthsBetween(user.lastVisitAt) : null;
    await notify.checkupReminder(user, { months });
    await prisma.user.update({ where: { id: user.id }, data: { lastCheckupReminderAt: new Date() } });
    await sleep(80);
  }
}

function guarded(name, job) {
  return async () => {
    if (running[name]) return;
    running[name] = true;
    try {
      await job();
    } catch (err) {
      console.error(`[eslatmalar:${name}]`, err.message);
    } finally {
      running[name] = false;
    }
  };
}

function start() {
  const reminders = guarded('qabul', appointmentReminders);
  const checkups = guarded('korik', checkupReminders);
  setTimeout(reminders, 20 * 1000);
  setTimeout(checkups, 60 * 1000);
  setInterval(reminders, 15 * MINUTE);
  setInterval(checkups, HOUR);
}

module.exports = { start, appointmentReminders, checkupReminders };
