const uz = require('./uz');
const ru = require('./ru');
const { groupDigits } = require('../utils/format');
const { weekday, nowLocal, addDays } = require('../utils/time');

const locales = { uz, ru };

const LANGUAGE_PROMPT = '🌐 Tilni tanlang / Выберите язык';
const LANGUAGE_BUTTONS = [
  { code: 'uz', label: "🇺🇿 O'zbekcha" },
  { code: 'ru', label: '🇷🇺 Русский' },
];

const getLocale = (lang) => locales[lang] || uz;

// Tanlangan tilga mos maydon: pick(service, 'name', 'ru') -> service.nameRu
const pick = (obj, field, lang) => {
  if (!obj) return '';
  const value = obj[`${field}${lang === 'ru' ? 'Ru' : 'Uz'}`];
  return value || obj[`${field}Uz`] || '';
};

function formatDate(L, date, { withWeekday = true } = {}) {
  const [y, m, d] = date.split('-').map(Number);
  const currentYear = Number(nowLocal().date.slice(0, 4));
  return L.date(d, L.months[m - 1], withWeekday ? L.weekdays[weekday(date)] : null, y !== currentYear ? y : null);
}

// "bugun" / "ertaga" / sana
function relativeDay(L, date) {
  const today = nowLocal().date;
  if (date === today) return L.today;
  if (date === addDays(today, 1)) return L.tomorrow;
  return formatDate(L, date);
}

function money(L, amount, from = false) {
  if (!amount) return L.free;
  return L.price(groupDigits(amount), from);
}

// Ikkala tildagi matnlar (masalan, menyu tugmalarini tanib olish uchun)
const both = (getter) => [getter(uz), getter(ru)];

module.exports = {
  locales,
  uz,
  ru,
  LANGUAGE_PROMPT,
  LANGUAGE_BUTTONS,
  getLocale,
  pick,
  formatDate,
  relativeDay,
  money,
  both,
};
