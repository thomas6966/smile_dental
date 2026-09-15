export const STATUS = {
  PENDING: { label: 'Kutilmoqda', tone: 'amber' },
  CONFIRMED: { label: 'Tasdiqlangan', tone: 'blue' },
  COMPLETED: { label: 'Yakunlangan', tone: 'green' },
  CANCELLED: { label: 'Bekor qilingan', tone: 'gray' },
  NO_SHOW: { label: 'Kelmadi', tone: 'red' },
};

export const SOURCE = {
  BOT: 'Telegram',
  ADMIN: 'Administrator',
};

export const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
export const WEEKDAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
export const WEEKDAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

const pad = (n) => String(n).padStart(2, '0');

export const groupDigits = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const money = (n) => `${groupDigits(n)} so'm`;

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function formatDate(date, { weekday = false, year = false } = {}) {
  if (!date) return '—';
  const [y, m, d] = date.split('-').map(Number);
  const wd = weekday ? `, ${WEEKDAYS[weekdayOf(date)].toLowerCase()}` : '';
  return `${d}-${MONTHS[m - 1]}${year ? ` ${y}` : ''}${wd}`;
}

export function shortDate(date) {
  if (!date) return '—';
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeAgo(value) {
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'hozirgina';
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  return formatDateTime(value);
}

export const toMinutes = (time) => {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
};

export const toTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

export const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '—';

export function formatPhone(phone) {
  if (!phone) return '—';
  const d = String(phone).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) {
    return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
  }
  return phone;
}

export function initials(name = '') {
  return name
    .replace(/^dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export function downloadCsv(filename, rows) {
  const escape = (value) => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const content = rows.map((row) => row.map(escape).join(';')).join('\n');
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let audioContext = null;
export function playBeep() {
  try {
    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioContext;
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1320;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.4);
    });
  } catch {
    // brauzer ovozni bloklagan bo'lishi mumkin
  }
}

export const REFRESH_EVENT = 'clinic:refresh';
export const emitRefresh = () => window.dispatchEvent(new Event(REFRESH_EVENT));

export const DOCTOR_COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#4b5563'];
