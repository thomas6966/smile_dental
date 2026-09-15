const config = require('../config/default');

const pad = (n) => String(n).padStart(2, '0');
const offsetMs = () => config.tzOffset * 3600 * 1000;

// Klinika vaqt mintaqasidagi hozirgi sana va daqiqa
function nowLocal() {
  const d = new Date(Date.now() + offsetMs());
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    hour: d.getUTCHours(),
  };
}

function toMinutes(time) {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

function toTime(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

// "2026-09-15" + "10:30" -> Date (UTC instant)
function toInstant(date, time) {
  const abs = Math.abs(config.tzOffset);
  const sign = config.tzOffset >= 0 ? '+' : '-';
  const oh = Math.floor(abs);
  const om = Math.round((abs - oh) * 60);
  return new Date(`${date}T${time}:00${sign}${pad(oh)}:${pad(om)}`);
}

function localDateOf(instant) {
  return new Date(new Date(instant).getTime() + offsetMs()).toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekday(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function monthsAgo(months, from = new Date()) {
  const d = new Date(from);
  d.setMonth(d.getMonth() - months);
  return d;
}

function monthsBetween(from, to = new Date()) {
  const a = new Date(from);
  const b = new Date(to);
  let months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) months -= 1;
  return Math.max(0, months);
}

module.exports = {
  pad,
  nowLocal,
  toMinutes,
  toTime,
  toInstant,
  localDateOf,
  addDays,
  weekday,
  daysInMonth,
  isValidDate,
  isValidTime,
  isValidMonth,
  monthsAgo,
  monthsBetween,
};
