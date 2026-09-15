const { prisma } = require('../database/connection');
const { isValidTime, toMinutes } = require('../utils/time');

const orderBy = [{ sortOrder: 'asc' }, { id: 'asc' }];

// 0 = yakshanba ... 6 = shanba
function defaultSchedule() {
  const schedule = {};
  for (let day = 0; day < 7; day += 1) {
    schedule[day] = {
      on: day !== 0,
      start: '09:00',
      end: '18:00',
      breakStart: '13:00',
      breakEnd: '14:00',
    };
  }
  return schedule;
}

function normalizeSchedule(input) {
  const base = defaultSchedule();
  if (!input || typeof input !== 'object') return base;
  for (let day = 0; day < 7; day += 1) {
    const src = input[day] || input[String(day)];
    if (!src) continue;
    const start = isValidTime(src.start) ? src.start : base[day].start;
    const end = isValidTime(src.end) ? src.end : base[day].end;
    const hasBreak = isValidTime(src.breakStart) && isValidTime(src.breakEnd) && src.breakStart < src.breakEnd;
    base[day] = {
      on: Boolean(src.on) && toMinutes(start) < toMinutes(end),
      start,
      end,
      breakStart: hasBreak ? src.breakStart : null,
      breakEnd: hasBreak ? src.breakEnd : null,
    };
  }
  return base;
}

async function ratings() {
  const rows = await prisma.appointment.groupBy({
    by: ['doctorId'],
    where: { rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const map = {};
  for (const row of rows) {
    map[row.doctorId] = {
      avg: Math.round((row._avg.rating || 0) * 10) / 10,
      count: row._count.rating,
    };
  }
  return map;
}

async function listActive() {
  const [doctors, rating] = await Promise.all([
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy,
      include: { services: { where: { isActive: true }, select: { id: true } } },
    }),
    ratings(),
  ]);
  return doctors.map((d) => toPublic(d, rating[d.id]));
}

function toPublic(doctor, rating) {
  return {
    id: doctor.id,
    fullName: doctor.fullName,
    specialtyUz: doctor.specialtyUz,
    specialtyRu: doctor.specialtyRu,
    bioUz: doctor.bioUz,
    bioRu: doctor.bioRu,
    photoUrl: doctor.photoUrl,
    experienceYears: doctor.experienceYears,
    color: doctor.color,
    schedule: doctor.schedule,
    serviceIds: (doctor.services || []).map((s) => s.id),
    rating: rating ? rating.avg : null,
    ratingCount: rating ? rating.count : 0,
  };
}

module.exports = { defaultSchedule, normalizeSchedule, ratings, listActive, toPublic };
