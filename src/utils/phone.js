// Har qanday ko'rinishdagi raqamni +998901234567 formatiga keltiradi
function normalizePhone(input) {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 9) digits = `998${digits}`;
  if (digits.length < 9 || digits.length > 15) return null;
  return `+${digits}`;
}

// +998901234567 -> +998 90 123 45 67
function formatPhone(phone) {
  if (!phone) return '';
  const d = String(phone).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) {
    return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
  }
  return phone;
}

module.exports = { normalizePhone, formatPhone };
