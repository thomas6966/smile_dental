const config = require('../config/default');
const { prisma } = require('../database/connection');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const catalog = require('../services/catalog');
const slots = require('../services/slots');
const notify = require('../services/notify');
const { HttpError, str, optStr, int, idParam } = require('../utils/http');
const { normalizePhone } = require('../utils/phone');
const { isValidDate, isValidTime, isValidMonth, nowLocal, monthsBetween } = require('../utils/time');

const MAX_ACTIVE_APPOINTMENTS = 5;

async function currentUser(req) {
  const { user } = await User.findOrCreateFromTelegram(req.tgUser);
  return user;
}

function userJSON(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    language: user.language,
    birthDate: user.birthDate,
    onboarded: user.onboarded,
    username: user.username,
    lastVisitAt: user.lastVisitAt,
    createdAt: user.createdAt,
  };
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function durationFor(serviceId) {
  const id = int(serviceId);
  if (id) {
    const { services } = await catalog.get();
    const service = services.find((s) => s.id === id);
    if (service) return service.durationMin;
  }
  const clinic = await Clinic.get();
  return clinic.slotStepMin || 30;
}

async function ownAppointment(userId, id) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, userId },
    include: Appointment.fullInclude,
  });
  if (!appointment) throw new HttpError(404, 'Qabul topilmadi', { code: 'NOT_FOUND' });
  return appointment;
}

function assertChangeable(appointment, clinic) {
  if (!Appointment.ACTIVE.includes(appointment.status) || appointment.startAt < new Date()) {
    throw new HttpError(400, "Bu qabulni o'zgartirib bo'lmaydi", { code: 'NOT_ALLOWED' });
  }
  if (appointment.startAt.getTime() - Date.now() < clinic.cancelLimitHours * 3600 * 1000) {
    throw new HttpError(400, 'Qabulga juda oz vaqt qoldi', { code: 'TOO_LATE' });
  }
}

// GET /api/client/bootstrap — ilova ochilganda kerak bo'lgan hamma narsa
exports.bootstrap = async (req, res) => {
  const user = await currentUser(req);
  const clinic = await Clinic.get();
  const [data, appointments, visits] = await Promise.all([
    catalog.get(),
    Appointment.listForUser(user.id),
    prisma.appointment.count({ where: { userId: user.id, status: 'COMPLETED' } }),
  ]);

  res.json({
    user: userJSON(user),
    clinic: Clinic.toPublic(clinic),
    categories: data.categories,
    services: data.services,
    doctors: data.doctors,
    appointments: {
      upcoming: appointments.upcoming.map((a) => Appointment.toClient(a, clinic)),
      history: appointments.history.map((a) => Appointment.toClient(a, clinic)),
    },
    stats: {
      visits,
      lastVisitAt: user.lastVisitAt,
      monthsSinceVisit: user.lastVisitAt ? monthsBetween(user.lastVisitAt) : null,
      nextCheckupAt: user.lastVisitAt ? addMonths(user.lastVisitAt, clinic.checkupIntervalMonths) : null,
    },
    botUsername: config.runtime.botUsername,
    today: nowLocal().date,
  });
};

// PATCH /api/client/me
exports.updateMe = async (req, res) => {
  const user = await currentUser(req);
  const body = req.body || {};
  const data = {};

  if (body.firstName !== undefined) {
    const firstName = str(body.firstName, 60);
    if (!firstName) throw new HttpError(400, 'Ismingizni kiriting', { code: 'NAME_REQUIRED' });
    data.firstName = firstName;
  }
  if (body.lastName !== undefined) data.lastName = optStr(body.lastName, 60);
  if (body.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    if (body.phone && !phone) throw new HttpError(400, "Telefon raqam noto'g'ri", { code: 'BAD_PHONE' });
    data.phone = phone;
  }
  if (body.language !== undefined) {
    if (!['uz', 'ru'].includes(body.language)) throw new HttpError(400, "Til noto'g'ri");
    data.language = body.language;
  }
  if (body.birthDate !== undefined) data.birthDate = isValidDate(body.birthDate) ? body.birthDate : null;
  if (body.onboarded !== undefined) data.onboarded = Boolean(body.onboarded);

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  res.json({ user: userJSON(updated) });
};

// GET /api/client/doctors/:id/calendar?month=2026-09&serviceId=1
exports.calendar = async (req, res) => {
  const doctorId = idParam(req);
  if (!isValidMonth(req.query.month)) throw new HttpError(400, "Oy noto'g'ri ko'rsatilgan");
  const duration = await durationFor(req.query.serviceId);
  const result = await slots.getMonthCalendar({
    doctorId,
    month: req.query.month,
    duration,
    excludeId: int(req.query.excludeId),
  });
  res.json(result);
};

// GET /api/client/doctors/:id/slots?date=2026-09-15&serviceId=1
exports.slots = async (req, res) => {
  const doctorId = idParam(req);
  if (!isValidDate(req.query.date)) throw new HttpError(400, "Sana noto'g'ri ko'rsatilgan");
  const duration = await durationFor(req.query.serviceId);
  const result = await slots.getDaySlots({
    doctorId,
    date: req.query.date,
    duration,
    excludeId: int(req.query.excludeId),
  });
  res.json(result);
};

// GET /api/client/appointments
exports.appointments = async (req, res) => {
  const user = await currentUser(req);
  const clinic = await Clinic.get();
  const { upcoming, history } = await Appointment.listForUser(user.id);
  res.json({
    upcoming: upcoming.map((a) => Appointment.toClient(a, clinic)),
    history: history.map((a) => Appointment.toClient(a, clinic)),
  });
};

// POST /api/client/appointments
exports.createAppointment = async (req, res) => {
  const user = await currentUser(req);
  const clinic = await Clinic.get();
  const body = req.body || {};

  const doctorId = int(body.doctorId);
  const serviceId = int(body.serviceId);
  const { date, time } = body;
  if (!doctorId || !isValidDate(date) || !isValidTime(time)) {
    throw new HttpError(400, "Ma'lumotlar to'liq emas", { code: 'BAD_REQUEST' });
  }

  const { services, doctors } = await catalog.get();
  const doctor = doctors.find((d) => d.id === doctorId);
  if (!doctor) throw new HttpError(404, 'Shifokor topilmadi', { code: 'NOT_FOUND' });
  const service = serviceId ? services.find((s) => s.id === serviceId) : null;
  if (serviceId && !service) throw new HttpError(404, 'Xizmat topilmadi', { code: 'NOT_FOUND' });

  const patch = {};
  const firstName = str(body.firstName, 60);
  if (firstName && firstName !== user.firstName) patch.firstName = firstName;
  if (body.phone) {
    const phone = normalizePhone(body.phone);
    if (!phone) throw new HttpError(400, "Telefon raqam noto'g'ri", { code: 'BAD_PHONE' });
    if (phone !== user.phone) patch.phone = phone;
  }
  if (!user.phone && !patch.phone) {
    throw new HttpError(400, 'Telefon raqamingizni kiriting', { code: 'PHONE_REQUIRED' });
  }

  const duration = service?.durationMin || clinic.slotStepMin;
  const [activeCount, fits] = await Promise.all([
    prisma.appointment.count({
      where: { userId: user.id, status: { in: Appointment.ACTIVE }, startAt: { gte: new Date() } },
    }),
    slots.fitsSchedule({ doctorId, date, time, duration }),
  ]);
  if (activeCount >= MAX_ACTIVE_APPOINTMENTS) {
    throw new HttpError(400, "Faol qabullaringiz juda ko'p", { code: 'TOO_MANY' });
  }
  if (!fits) throw new HttpError(409, 'Bu vaqt band', { code: 'SLOT_TAKEN' });

  const [appointment] = await Promise.all([
    Appointment.create({
      userId: user.id,
      doctorId,
      serviceId: service?.id ?? null,
      date,
      startTime: time,
      durationMin: duration,
      status: clinic.autoConfirm ? 'CONFIRMED' : 'PENDING',
      source: 'BOT',
      extra: { complaint: optStr(body.complaint, 500) },
    }),
    Object.keys(patch).length ? prisma.user.update({ where: { id: user.id }, data: patch }) : null,
  ]);

  Notification.create('NEW_BOOKING', appointment.id);
  notify.bookingCreated(appointment).catch(() => {});
  res.status(201).json({ appointment: Appointment.toClient(appointment, clinic) });
};

// POST /api/client/appointments/:id/cancel
exports.cancelAppointment = async (req, res) => {
  const user = await currentUser(req);
  const clinic = await Clinic.get();
  const appointment = await ownAppointment(user.id, idParam(req));
  assertChangeable(appointment, clinic);

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: 'CANCELLED', cancelledBy: 'PATIENT', cancelReason: optStr(req.body?.reason, 300) },
    include: Appointment.fullInclude,
  });
  Notification.create('CANCELLED', appointment.id);
  res.json({ appointment: Appointment.toClient(updated, clinic) });
};

// POST /api/client/appointments/:id/reschedule
exports.rescheduleAppointment = async (req, res) => {
  const user = await currentUser(req);
  const clinic = await Clinic.get();
  const appointment = await ownAppointment(user.id, idParam(req));
  assertChangeable(appointment, clinic);

  const { date, time } = req.body || {};
  if (!isValidDate(date) || !isValidTime(time)) {
    throw new HttpError(400, "Sana yoki vaqt noto'g'ri", { code: 'BAD_REQUEST' });
  }
  const doctorId = int(req.body.doctorId) || appointment.doctorId;
  const duration = appointment.service?.durationMin || Appointment.durationOf(appointment);

  const fits = await slots.fitsSchedule({ doctorId, date, time, duration });
  if (!fits) throw new HttpError(409, 'Bu vaqt band', { code: 'SLOT_TAKEN' });

  const updated = await Appointment.reschedule(appointment.id, {
    doctorId,
    date,
    startTime: time,
    durationMin: duration,
    status: clinic.autoConfirm ? 'CONFIRMED' : 'PENDING',
  });
  Notification.create('RESCHEDULED', appointment.id);
  notify.rescheduled(updated).catch(() => {});
  res.json({ appointment: Appointment.toClient(updated, clinic) });
};

// POST /api/client/appointments/:id/rate
exports.rateAppointment = async (req, res) => {
  const user = await currentUser(req);
  const clinic = await Clinic.get();
  const appointment = await ownAppointment(user.id, idParam(req));
  const rating = int(req.body?.rating);
  if (!rating || rating < 1 || rating > 5) throw new HttpError(400, "Baho 1 dan 5 gacha bo'lishi kerak");
  if (appointment.status !== 'COMPLETED') {
    throw new HttpError(400, "Faqat yakunlangan qabulni baholash mumkin", { code: 'NOT_ALLOWED' });
  }

  const feedback = optStr(req.body?.feedback, 1000);
  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { rating, ...(feedback ? { feedback } : {}) },
    include: Appointment.fullInclude,
  });
  if (appointment.rating == null) Notification.create('RATED', appointment.id);
  catalog.invalidate();
  res.json({ appointment: Appointment.toClient(updated, clinic) });
};
