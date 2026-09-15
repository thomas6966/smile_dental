export const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

export function categoryIcon(categories, categoryId) {
  return categories.find((c) => c.id === categoryId)?.icon || '🦷';
}

export function discountPercent(service) {
  if (!service?.oldPrice || service.oldPrice <= service.price) return 0;
  return Math.round(((service.oldPrice - service.price) / service.oldPrice) * 100);
}

export function doctorsForService(doctors, service) {
  if (!service || !service.doctorIds?.length) return doctors;
  return doctors.filter((d) => service.doctorIds.includes(d.id));
}

export function servicesForDoctor(services, doctor) {
  if (!doctor) return services;
  return services.filter((s) => !s.doctorIds?.length || s.doctorIds.includes(doctor.id));
}

export function descriptionLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.replace(/^[•\-–\s]+/, '').trim())
    .filter(Boolean);
}

export function formatPhone(phone) {
  if (!phone) return '';
  const d = String(phone).replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) {
    return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
  }
  return phone;
}

export function minutesBetween(start, end) {
  const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMin(end) - toMin(start);
}

export function socialUrl(value, type) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '');
  return type === 'instagram' ? `https://instagram.com/${handle}` : `https://t.me/${handle}`;
}
