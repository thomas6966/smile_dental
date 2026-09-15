const { prisma } = require('../database/connection');
const Clinic = require('../models/Clinic');
const catalog = require('./catalog');
const { nowLocal, toMinutes, toTime, addDays, weekday, daysInMonth, pad } = require('../utils/time');

const BUSY = ['PENDING', 'CONFIRMED', 'COMPLETED'];

function isDayOff(timeOffs, doctorId, date) {
  return timeOffs.some(
    (t) => (t.doctorId === null || t.doctorId === doctorId) && t.dateFrom <= date && date <= t.dateTo,
  );
}

// Bir kunlik bo'sh/band vaqtlar
function buildDay({ doctor, date, duration, appointments, timeOffs, clinic, now, excludeId, ignoreRules }) {
  if (!ignoreRules) {
    if (date < now.date) return { status: 'past', slots: [] };
    if (date > addDays(now.date, clinic.bookingDaysAhead)) return { status: 'closed', slots: [] };
  }
  if (isDayOff(timeOffs, doctor.id, date)) return { status: 'off', slots: [] };

  const day = (doctor.schedule || {})[weekday(date)];
  if (!day || !day.on) return { status: 'off', slots: [] };

  const start = toMinutes(day.start);
  const end = toMinutes(day.end);
  const breakStart = day.breakStart ? toMinutes(day.breakStart) : null;
  const breakEnd = day.breakEnd ? toMinutes(day.breakEnd) : null;
  const step = Math.max(5, clinic.slotStepMin || 30);

  const busy = appointments
    .filter((a) => a.doctorId === doctor.id && a.date === date && a.id !== excludeId && BUSY.includes(a.status))
    .map((a) => [toMinutes(a.startTime), toMinutes(a.endTime)]);

  const slots = [];
  for (let t = start; t + duration <= end; t += step) {
    const finish = t + duration;
    if (breakStart !== null && breakEnd !== null && t < breakEnd && finish > breakStart) continue;
    if (!ignoreRules && date === now.date && t < now.minutes) continue;

    let available = !busy.some(([s, e]) => t < e && finish > s);
    if (available && !ignoreRules && date === now.date && t < now.minutes + clinic.minLeadMinutes) {
      available = false;
    }
    slots.push({ time: toTime(t), available });
  }
  return { status: 'ok', slots };
}

async function loadContext(doctorId, dateFrom, dateTo, { withAppointments = true } = {}) {
  const [data, clinic, appointments] = await Promise.all([
    catalog.get(),
    Clinic.get(),
    withAppointments
      ? prisma.appointment.findMany({
          where: { doctorId, date: { gte: dateFrom, lte: dateTo }, status: { in: BUSY } },
          select: { id: true, doctorId: true, date: true, startTime: true, endTime: true, status: true },
        })
      : [],
  ]);

  let doctor = data.doctors.find((d) => d.id === doctorId) || null;
  const active = Boolean(doctor);
  if (!doctor) doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });

  let timeOffs = data.timeOffs;
  if (dateFrom < addDays(nowLocal().date, -1)) {
    timeOffs = await prisma.timeOff.findMany({ where: { dateFrom: { lte: dateTo }, dateTo: { gte: dateFrom } } });
  }
  return { doctor, active, appointments, timeOffs, clinic };
}

async function getDaySlots({ doctorId, date, duration, excludeId = null, ignoreRules = false }) {
  const ctx = await loadContext(doctorId, date, date);
  if (!ctx.doctor || (!ctx.active && !ignoreRules)) return { date, status: 'off', slots: [] };
  const result = buildDay({ ...ctx, date, duration, excludeId, ignoreRules, now: nowLocal() });
  return { date, ...result };
}

async function getMonthCalendar({ doctorId, month, duration, excludeId = null }) {
  const total = daysInMonth(month);
  const first = `${month}-01`;
  const last = `${month}-${pad(total)}`;
  const now = nowLocal();
  const clinic = await Clinic.get();
  const maxDate = addDays(now.date, clinic.bookingDaysAhead);

  // O'tgan yoki juda uzoq oylar uchun bazaga murojaat qilinmaydi
  const needsData = last >= now.date && first <= maxDate;
  const ctx = needsData
    ? await loadContext(doctorId, first < now.date ? now.date : first, last > maxDate ? maxDate : last)
    : { doctor: null, active: false, appointments: [], timeOffs: [], clinic };

  const days = [];
  for (let d = 1; d <= total; d += 1) {
    const date = `${month}-${pad(d)}`;
    if (date < now.date) {
      days.push({ date, status: 'past', free: 0 });
      continue;
    }
    if (date > maxDate) {
      days.push({ date, status: 'closed', free: 0 });
      continue;
    }
    if (!ctx.doctor || !ctx.active) {
      days.push({ date, status: 'off', free: 0 });
      continue;
    }
    const result = buildDay({ ...ctx, date, duration, excludeId, now, ignoreRules: false });
    const free = result.slots.filter((s) => s.available).length;
    days.push({
      date,
      status: result.status === 'ok' ? (free ? 'available' : 'full') : result.status,
      free,
    });
  }

  return { month, today: now.date, maxDate, days };
}

// Vaqt shifokor jadvaliga va klinika qoidalariga mosligini tekshiradi.
// Boshqa qabullar bilan to'qnashuv esa yozish vaqtida tranzaksiya ichida tekshiriladi.
async function fitsSchedule({ doctorId, date, time, duration }) {
  const ctx = await loadContext(doctorId, date, date, { withAppointments: false });
  if (!ctx.doctor || !ctx.active) return false;
  const result = buildDay({ ...ctx, date, duration, excludeId: null, ignoreRules: false, now: nowLocal() });
  return result.slots.some((s) => s.time === time && s.available);
}

module.exports = { getDaySlots, getMonthCalendar, fitsSchedule };
