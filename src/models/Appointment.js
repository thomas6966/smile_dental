const { prisma } = require('../database/connection');
const { HttpError } = require('../utils/http');
const { toMinutes, toTime, toInstant } = require('../utils/time');

const STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const ACTIVE = ['PENDING', 'CONFIRMED'];
const BUSY = ['PENDING', 'CONFIRMED', 'COMPLETED'];
const fullInclude = { user: true, doctor: true, service: true };

// Bitta shifokorga bir vaqtda ikki kishi yozilib qolmasligi uchun qulf
async function lockDoctor(tx, doctorId) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${Number(doctorId)}::bigint)`;
}

function findConflict(db, { doctorId, date, startTime, endTime, excludeId }) {
  return db.appointment.findFirst({
    where: {
      doctorId,
      date,
      status: { in: BUSY },
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

function computeTimes(date, startTime, durationMin) {
  const end = toMinutes(startTime) + durationMin;
  if (end > 24 * 60) throw new HttpError(400, 'Qabul vaqti kun oxiridan oshib ketdi');
  const endTime = toTime(end);
  return { endTime, startAt: toInstant(date, startTime), endAt: toInstant(date, endTime) };
}

const txOptions = { maxWait: 15000, timeout: 20000 };

async function create(input, { force = false } = {}) {
  const {
    userId,
    doctorId,
    serviceId = null,
    date,
    startTime,
    durationMin,
    status = 'PENDING',
    source = 'BOT',
    extra = {},
  } = input;
  const times = computeTimes(date, startTime, durationMin);

  return prisma.$transaction(async (tx) => {
    await lockDoctor(tx, doctorId);
    if (!force) {
      const conflict = await findConflict(tx, { doctorId, date, startTime, endTime: times.endTime });
      if (conflict) throw new HttpError(409, 'Bu vaqt band', { code: 'SLOT_TAKEN' });
    }
    return tx.appointment.create({
      data: {
        userId,
        doctorId,
        serviceId,
        date,
        startTime,
        endTime: times.endTime,
        startAt: times.startAt,
        endAt: times.endAt,
        status,
        source,
        ...extra,
      },
      include: fullInclude,
    });
  }, txOptions);
}

async function reschedule(id, input, { force = false } = {}) {
  const { doctorId, date, startTime, durationMin, serviceId, status, extra = {} } = input;
  const times = computeTimes(date, startTime, durationMin);

  return prisma.$transaction(async (tx) => {
    await lockDoctor(tx, doctorId);
    if (!force) {
      const conflict = await findConflict(tx, { doctorId, date, startTime, endTime: times.endTime, excludeId: id });
      if (conflict) throw new HttpError(409, 'Bu vaqt band', { code: 'SLOT_TAKEN' });
    }
    return tx.appointment.update({
      where: { id },
      data: {
        doctorId,
        date,
        startTime,
        endTime: times.endTime,
        startAt: times.startAt,
        endAt: times.endAt,
        reminderDaySent: false,
        reminderHourSent: false,
        ...(serviceId !== undefined ? { serviceId } : {}),
        ...(status ? { status } : {}),
        ...extra,
      },
      include: fullInclude,
    });
  }, txOptions);
}

async function listForUser(userId) {
  const now = new Date();
  const [upcoming, history] = await Promise.all([
    prisma.appointment.findMany({
      where: { userId, status: { in: ACTIVE }, endAt: { gte: now } },
      orderBy: { startAt: 'asc' },
      include: fullInclude,
    }),
    prisma.appointment.findMany({
      where: {
        userId,
        OR: [{ status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } }, { status: { in: ACTIVE }, endAt: { lt: now } }],
      },
      orderBy: { startAt: 'desc' },
      take: 50,
      include: fullInclude,
    }),
  ]);
  return { upcoming, history };
}

const durationOf = (a) => toMinutes(a.endTime) - toMinutes(a.startTime);

// Mini App uchun
function toClient(a, clinic) {
  const limitMs = (clinic?.cancelLimitHours ?? 3) * 3600 * 1000;
  const changeable = ACTIVE.includes(a.status) && new Date(a.startAt).getTime() - Date.now() >= limitMs;
  return {
    id: a.id,
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    durationMin: durationOf(a),
    status: a.status,
    source: a.source,
    complaint: a.complaint,
    diagnosis: a.diagnosis,
    recommendation: a.recommendation,
    price: a.price,
    rating: a.rating,
    feedback: a.feedback,
    cancelReason: a.cancelReason,
    createdAt: a.createdAt,
    canCancel: changeable,
    canReschedule: changeable,
    canRate: a.status === 'COMPLETED' && a.rating == null,
    doctor: a.doctor
      ? {
          id: a.doctor.id,
          fullName: a.doctor.fullName,
          specialtyUz: a.doctor.specialtyUz,
          specialtyRu: a.doctor.specialtyRu,
          photoUrl: a.doctor.photoUrl,
          color: a.doctor.color,
        }
      : null,
    service: a.service
      ? {
          id: a.service.id,
          nameUz: a.service.nameUz,
          nameRu: a.service.nameRu,
          price: a.service.price,
          priceFrom: a.service.priceFrom,
          durationMin: a.service.durationMin,
        }
      : null,
  };
}

// Admin Panel uchun
function toAdmin(a) {
  return {
    id: a.id,
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    durationMin: durationOf(a),
    startAt: a.startAt,
    status: a.status,
    source: a.source,
    complaint: a.complaint,
    adminNote: a.adminNote,
    diagnosis: a.diagnosis,
    recommendation: a.recommendation,
    price: a.price,
    rating: a.rating,
    feedback: a.feedback,
    cancelReason: a.cancelReason,
    cancelledBy: a.cancelledBy,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    user: a.user
      ? {
          id: a.user.id,
          firstName: a.user.firstName,
          lastName: a.user.lastName,
          phone: a.user.phone,
          username: a.user.username,
          hasTelegram: Boolean(a.user.telegramId),
          language: a.user.language,
          isDemo: a.user.isDemo,
        }
      : null,
    doctor: a.doctor ? { id: a.doctor.id, fullName: a.doctor.fullName, color: a.doctor.color } : null,
    service: a.service
      ? {
          id: a.service.id,
          nameUz: a.service.nameUz,
          nameRu: a.service.nameRu,
          price: a.service.price,
          durationMin: a.service.durationMin,
        }
      : null,
  };
}

module.exports = {
  STATUSES,
  ACTIVE,
  BUSY,
  fullInclude,
  create,
  reschedule,
  listForUser,
  durationOf,
  toClient,
  toAdmin,
};
