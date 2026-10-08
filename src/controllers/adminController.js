const jwt = require('jsonwebtoken');
const config = require('../config/default');
const { prisma } = require('../database/connection');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const catalog = require('../services/catalog');
const slots = require('../services/slots');
const notify = require('../services/notify');
const broadcaster = require('../services/broadcast');
const { hashPassword, verifyPassword } = require('../utils/password');
const { loginFailed, loginSucceeded, forgetAdmin } = require('../middlewares/auth.middleware');
const { HttpError, str, optStr, int, float, bool, idParam } = require('../utils/http');
const { normalizePhone } = require('../utils/phone');
const time = require('../utils/time');

const include = Appointment.fullInclude;
const toAdmin = Appointment.toAdmin;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const orderBy = [{ sortOrder: 'asc' }, { id: 'asc' }];

function pagination(req, { max = 100, def = 20 } = {}) {
  const page = Math.max(1, int(req.query.page, 1));
  const pageSize = clamp(int(req.query.pageSize, def), 1, max);
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

function searchUserWhere(q) {
  const digits = q.replace(/\D/g, '');
  return {
    OR: [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { username: { contains: q.replace(/^@/, ''), mode: 'insensitive' } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ],
  };
}

// ======================= AUTH =======================

exports.login = async (req, res) => {
  const username = str(req.body?.username, 60).toLowerCase();
  const password = String(req.body?.password || '');
  const admin = username ? await prisma.admin.findUnique({ where: { username } }) : null;

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    loginFailed(req);
    throw new HttpError(401, "Login yoki parol noto'g'ri");
  }
  loginSucceeded(req);

  const payload = { id: admin.id, username: admin.username, fullName: admin.fullName };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
  res.json({ token, admin: payload });
};

exports.me = async (req, res) => {
  res.json({ admin: req.admin });
};

// ======================= DASHBOARD =======================

exports.dashboard = async (req, res) => {
  const { date: today } = time.nowLocal();
  const monthStart = `${today.slice(0, 7)}-01`;
  const chartFrom = time.addDays(today, -13);
  const now = new Date();

  const [
    todayList,
    pending,
    revenue,
    monthVisits,
    newPatients,
    totalPatients,
    cancelledMonth,
    unmarked,
    chartRows,
    topRows,
    ratingAgg,
    reviews,
  ] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: today, status: { not: 'CANCELLED' } },
      orderBy: { startTime: 'asc' },
      include,
    }),
    prisma.appointment.findMany({
      where: { status: 'PENDING', startAt: { gte: now } },
      orderBy: { startAt: 'asc' },
      take: 10,
      include,
    }),
    prisma.appointment.aggregate({ where: { status: 'COMPLETED', date: { gte: monthStart } }, _sum: { price: true } }),
    prisma.appointment.count({ where: { status: 'COMPLETED', date: { gte: monthStart } } }),
    prisma.user.count({ where: { createdAt: { gte: time.toInstant(monthStart, '00:00') } } }),
    prisma.user.count(),
    prisma.appointment.count({ where: { status: { in: ['CANCELLED', 'NO_SHOW'] }, date: { gte: monthStart } } }),
    prisma.appointment.findMany({
      where: { status: { in: Appointment.ACTIVE }, endAt: { lt: now } },
      orderBy: { startAt: 'desc' },
      take: 20,
      include,
    }),
    prisma.appointment.groupBy({
      by: ['date'],
      where: { date: { gte: chartFrom, lte: today }, status: { not: 'CANCELLED' } },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ['serviceId'],
      where: { date: { gte: monthStart }, status: { not: 'CANCELLED' }, serviceId: { not: null } },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 5,
    }),
    prisma.appointment.aggregate({ where: { rating: { not: null } }, _avg: { rating: true }, _count: { rating: true } }),
    prisma.appointment.findMany({
      where: { rating: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      include,
    }),
  ]);

  const pendingTotal = pending.length < 10
    ? pending.length
    : await prisma.appointment.count({ where: { status: 'PENDING', startAt: { gte: now } } });

  const chart = [];
  for (let i = 0; i < 14; i += 1) {
    const date = time.addDays(chartFrom, i);
    const row = chartRows.find((r) => r.date === date);
    chart.push({ date, count: row ? row._count._all : 0 });
  }

  const topServiceIds = topRows.map((r) => r.serviceId);
  const topServiceList = topServiceIds.length
    ? await prisma.service.findMany({ where: { id: { in: topServiceIds } }, select: { id: true, nameUz: true } })
    : [];
  const topServices = topRows.map((r) => ({
    id: r.serviceId,
    name: topServiceList.find((s) => s.id === r.serviceId)?.nameUz || '—',
    count: r._count.serviceId,
  }));

  res.json({
    today,
    stats: {
      todayTotal: todayList.length,
      todayCompleted: todayList.filter((a) => a.status === 'COMPLETED').length,
      pending: pendingTotal,
      monthRevenue: revenue._sum.price || 0,
      monthVisits,
      newPatients,
      totalPatients,
      cancelledMonth,
      rating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
      ratingCount: ratingAgg._count.rating,
    },
    todayList: todayList.map(toAdmin),
    pending: pending.map(toAdmin),
    unmarked: unmarked.map(toAdmin),
    chart,
    topServices,
    reviews: reviews.map(toAdmin),
  });
};

// ======================= BILDIRISHNOMALAR =======================

exports.notifications = async (req, res) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { id: 'desc' },
      take: 30,
      include: { appointment: { include } },
    }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);
  res.json({
    unread,
    items: items.map((n) => ({
      id: n.id,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
      appointment: n.appointment ? toAdmin(n.appointment) : null,
    })),
  });
};

exports.readNotifications = async (req, res) => {
  await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  res.json({ ok: true });
};

// ======================= KALENDAR =======================

exports.calendar = async (req, res) => {
  const { from } = req.query;
  const to = req.query.to || from;
  if (!time.isValidDate(from) || !time.isValidDate(to) || to < from) {
    throw new HttpError(400, "Sana oralig'i noto'g'ri");
  }
  if (time.addDays(from, 42) < to) throw new HttpError(400, "Sana oralig'i juda katta");
  const doctorId = int(req.query.doctorId);

  const [doctors, appointments, timeOffs, clinic] = await Promise.all([
    prisma.doctor.findMany({ where: { isActive: true }, orderBy }),
    prisma.appointment.findMany({
      where: {
        date: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
        ...(doctorId ? { doctorId } : {}),
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include,
    }),
    prisma.timeOff.findMany({ where: { dateFrom: { lte: to }, dateTo: { gte: from } } }),
    Clinic.get(),
  ]);

  res.json({
    from,
    to,
    slotStepMin: clinic.slotStepMin,
    doctors: doctors.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      specialtyUz: d.specialtyUz,
      color: d.color,
      schedule: d.schedule,
    })),
    appointments: appointments.map(toAdmin),
    timeOffs,
  });
};

exports.slots = async (req, res) => {
  const doctorId = int(req.query.doctorId);
  if (!doctorId || !time.isValidDate(req.query.date)) throw new HttpError(400, "Shifokor yoki sana noto'g'ri");
  const clinic = await Clinic.get();
  const duration = clamp(int(req.query.duration, clinic.slotStepMin), 5, 600);
  const result = await slots.getDaySlots({
    doctorId,
    date: req.query.date,
    duration,
    excludeId: int(req.query.excludeId),
    ignoreRules: true,
  });
  res.json(result);
};

// ======================= QABULLAR =======================

exports.listAppointments = async (req, res) => {
  const { page, pageSize, skip, take } = pagination(req, { max: 1000 });
  const where = {};
  const { from, to, status, source } = req.query;

  if (time.isValidDate(from) || time.isValidDate(to)) {
    where.date = {};
    if (time.isValidDate(from)) where.date.gte = from;
    if (time.isValidDate(to)) where.date.lte = to;
  }
  if (Appointment.STATUSES.includes(status)) where.status = status;
  if (['BOT', 'ADMIN'].includes(source)) where.source = source;
  if (int(req.query.doctorId)) where.doctorId = int(req.query.doctorId);
  const q = str(req.query.q, 60);
  if (q) where.user = searchUserWhere(q);

  const direction = req.query.sort === 'asc' ? 'asc' : 'desc';
  const [total, items] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({ where, orderBy: [{ startAt: direction }], skip, take, include }),
  ]);
  res.json({ total, page, pageSize, items: items.map(toAdmin) });
};

exports.getAppointment = async (req, res) => {
  const appointment = await prisma.appointment.findUnique({ where: { id: idParam(req) }, include });
  if (!appointment) throw new HttpError(404, 'Qabul topilmadi');
  res.json({ appointment: toAdmin(appointment) });
};

function treatmentFields(body) {
  const data = {};
  for (const field of ['complaint', 'adminNote', 'diagnosis', 'recommendation']) {
    if (body[field] !== undefined) data[field] = optStr(body[field], 2000);
  }
  if (body.price !== undefined) {
    const price = int(body.price);
    data.price = price !== null && price >= 0 ? price : null;
  }
  return data;
}

async function resolvePatient(body) {
  const patientId = int(body.patientId);
  if (patientId) {
    const user = await prisma.user.findUnique({ where: { id: patientId } });
    if (!user) throw new HttpError(404, 'Bemor topilmadi');
    return user;
  }

  const firstName = str(body.patient?.firstName, 60);
  const phone = normalizePhone(body.patient?.phone);
  if (!firstName) throw new HttpError(400, 'Bemorning ismini kiriting');
  if (!phone) throw new HttpError(400, "Telefon raqam noto'g'ri");

  const existing = await prisma.user.findFirst({ where: { phone, isDemo: false }, orderBy: { createdAt: 'asc' } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      firstName,
      lastName: optStr(body.patient?.lastName, 60),
      phone,
      language: body.patient?.language === 'ru' ? 'ru' : 'uz',
    },
  });
}

exports.createAppointment = async (req, res) => {
  const body = req.body || {};
  const doctorId = int(body.doctorId);
  if (!doctorId) throw new HttpError(400, 'Shifokorni tanlang');
  if (!time.isValidDate(body.date) || !time.isValidTime(body.time)) throw new HttpError(400, 'Sana va vaqtni tanlang');

  const [doctor, service, clinic] = await Promise.all([
    prisma.doctor.findUnique({ where: { id: doctorId } }),
    int(body.serviceId) ? prisma.service.findUnique({ where: { id: int(body.serviceId) } }) : null,
    Clinic.get(),
  ]);
  if (!doctor) throw new HttpError(404, 'Shifokor topilmadi');

  const duration = clamp(int(body.durationMin) || service?.durationMin || clinic.slotStepMin, 5, 600);
  const status = Appointment.STATUSES.includes(body.status) ? body.status : 'CONFIRMED';
  const patient = await resolvePatient(body);

  const appointment = await Appointment.create(
    {
      userId: patient.id,
      doctorId,
      serviceId: service?.id ?? null,
      date: body.date,
      startTime: body.time,
      durationMin: duration,
      status,
      source: 'ADMIN',
      extra: treatmentFields(body),
    },
    { force: bool(body.force) },
  );

  if (status === 'COMPLETED') await User.refreshLastVisit(patient.id);
  const upcoming = Appointment.ACTIVE.includes(status) && appointment.startAt > new Date();
  if (bool(body.notify, true) && upcoming) {
    notify.bookingCreated(appointment, { byAdmin: true }).catch(() => {});
  }
  res.status(201).json({ appointment: toAdmin(appointment) });
};

exports.updateAppointment = async (req, res) => {
  const id = idParam(req);
  const body = req.body || {};
  const current = await prisma.appointment.findUnique({ where: { id }, include });
  if (!current) throw new HttpError(404, 'Qabul topilmadi');

  const doctorId = int(body.doctorId) || current.doctorId;
  const date = body.date ?? current.date;
  const startTime = body.time ?? current.startTime;
  if (!time.isValidDate(date) || !time.isValidTime(startTime)) throw new HttpError(400, "Sana yoki vaqt noto'g'ri");

  let serviceId = current.serviceId;
  let service = current.service;
  if (body.serviceId !== undefined) {
    serviceId = int(body.serviceId) || null;
    service = serviceId ? await prisma.service.findUnique({ where: { id: serviceId } }) : null;
    if (serviceId && !service) throw new HttpError(404, 'Xizmat topilmadi');
  }

  const currentDuration = Appointment.durationOf(current);
  let duration = int(body.durationMin);
  if (!duration) duration = body.serviceId !== undefined && service ? service.durationMin : currentDuration;
  duration = clamp(duration, 5, 600);

  const extra = treatmentFields(body);
  const timeChanged =
    doctorId !== current.doctorId || date !== current.date || startTime !== current.startTime || duration !== currentDuration;

  let updated;
  if (timeChanged) {
    updated = await Appointment.reschedule(
      id,
      { doctorId, date, startTime, durationMin: duration, serviceId, extra },
      { force: bool(body.force) },
    );
  } else {
    updated = await prisma.appointment.update({ where: { id }, data: { serviceId, ...extra }, include });
  }

  if (updated.status === 'COMPLETED') await User.refreshLastVisit(updated.userId);
  const upcoming = Appointment.ACTIVE.includes(updated.status) && updated.startAt > new Date();
  if (timeChanged && upcoming && bool(body.notify, true)) notify.rescheduled(updated).catch(() => {});
  res.json({ appointment: toAdmin(updated) });
};

exports.setStatus = async (req, res) => {
  const id = idParam(req);
  const body = req.body || {};
  const { status } = body;
  if (!Appointment.STATUSES.includes(status)) throw new HttpError(400, "Holat noto'g'ri");

  const current = await prisma.appointment.findUnique({ where: { id }, include });
  if (!current) throw new HttpError(404, 'Qabul topilmadi');

  const data = { status };
  if (status === 'CANCELLED') {
    data.cancelReason = optStr(body.cancelReason, 300);
    data.cancelledBy = 'ADMIN';
  }
  if (status === 'COMPLETED') {
    Object.assign(data, treatmentFields(body));
    if (data.price === undefined && current.price == null && current.service) data.price = current.service.price;
  }
  if (status !== 'CANCELLED' && current.status === 'CANCELLED') {
    data.cancelReason = null;
    data.cancelledBy = null;
  }

  const updated = await prisma.appointment.update({ where: { id }, data, include });
  if (status === 'COMPLETED' || current.status === 'COMPLETED') await User.refreshLastVisit(updated.userId);

  if (bool(body.notify, true) && current.status !== status) {
    const future = updated.startAt > new Date();
    if (status === 'CONFIRMED' && future) notify.confirmed(updated).catch(() => {});
    if (status === 'CANCELLED' && future) notify.cancelledByAdmin(updated).catch(() => {});
    if (status === 'COMPLETED') notify.completed(updated).catch(() => {});
  }
  res.json({ appointment: toAdmin(updated) });
};

exports.deleteAppointment = async (req, res) => {
  const id = idParam(req);
  const appointment = await prisma.appointment.delete({ where: { id } });
  await User.refreshLastVisit(appointment.userId);
  res.json({ ok: true });
};

// ======================= BEMORLAR =======================

function patientJSON(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    username: user.username,
    hasTelegram: Boolean(user.telegramId),
    isBlocked: user.isBlocked,
    isDemo: user.isDemo,
    language: user.language,
    birthDate: user.birthDate,
    notes: user.notes,
    lastVisitAt: user.lastVisitAt,
    lastCheckupReminderAt: user.lastCheckupReminderAt,
    createdAt: user.createdAt,
  };
}

exports.listPatients = async (req, res) => {
  const { page, pageSize, skip, take } = pagination(req, { max: 1000 });
  const q = str(req.query.q, 60);
  const where = q ? searchUserWhere(q) : {};
  if (req.query.filter === 'telegram') where.telegramId = { not: null };
  if (req.query.filter === 'offline') where.telegramId = null;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
  ]);

  const ids = users.map((u) => u.id);
  const [completed, upcoming] = ids.length
    ? await Promise.all([
        prisma.appointment.groupBy({
          by: ['userId'],
          where: { userId: { in: ids }, status: 'COMPLETED' },
          _sum: { price: true },
          _count: { _all: true },
        }),
        prisma.appointment.findMany({
          where: { userId: { in: ids }, status: { in: Appointment.ACTIVE }, startAt: { gte: new Date() } },
          orderBy: { startAt: 'asc' },
          select: { userId: true, date: true, startTime: true },
        }),
      ])
    : [[], []];

  res.json({
    total,
    page,
    pageSize,
    items: users.map((u) => {
      const stats = completed.find((c) => c.userId === u.id);
      const next = upcoming.find((a) => a.userId === u.id);
      return {
        ...patientJSON(u),
        visits: stats ? stats._count._all : 0,
        spent: stats ? stats._sum.price || 0 : 0,
        nextAppointment: next ? { date: next.date, startTime: next.startTime } : null,
      };
    }),
  });
};

exports.getPatient = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: idParam(req) },
    include: { appointments: { orderBy: { startAt: 'desc' }, include } },
  });
  if (!user) throw new HttpError(404, 'Bemor topilmadi');

  const completed = user.appointments.filter((a) => a.status === 'COMPLETED');
  res.json({
    patient: patientJSON(user),
    stats: {
      visits: completed.length,
      spent: completed.reduce((sum, a) => sum + (a.price || 0), 0),
      cancelled: user.appointments.filter((a) => a.status === 'CANCELLED').length,
      noShow: user.appointments.filter((a) => a.status === 'NO_SHOW').length,
    },
    appointments: user.appointments.map(toAdmin),
  });
};

function patientData(body, { partial = false } = {}) {
  const data = {};
  if (!partial || body.firstName !== undefined) {
    const firstName = str(body.firstName, 60);
    if (!firstName) throw new HttpError(400, 'Bemorning ismini kiriting');
    data.firstName = firstName;
  }
  if (!partial || body.phone !== undefined) {
    const phone = normalizePhone(body.phone);
    if (!phone) throw new HttpError(400, "Telefon raqam noto'g'ri");
    data.phone = phone;
  }
  if (body.lastName !== undefined) data.lastName = optStr(body.lastName, 60);
  if (body.birthDate !== undefined) data.birthDate = time.isValidDate(body.birthDate) ? body.birthDate : null;
  if (body.notes !== undefined) data.notes = optStr(body.notes, 2000);
  if (body.language !== undefined) data.language = body.language === 'ru' ? 'ru' : 'uz';
  return data;
}

exports.createPatient = async (req, res) => {
  const data = patientData(req.body || {});
  const existing = await prisma.user.findFirst({ where: { phone: data.phone, isDemo: false } });
  if (existing) {
    throw new HttpError(409, "Bu raqam bilan bemor allaqachon mavjud", { code: 'DUPLICATE', patientId: existing.id });
  }
  const user = await prisma.user.create({ data });
  res.status(201).json({ patient: patientJSON(user) });
};

exports.updatePatient = async (req, res) => {
  const user = await prisma.user.update({ where: { id: idParam(req) }, data: patientData(req.body || {}, { partial: true }) });
  res.json({ patient: patientJSON(user) });
};

exports.deletePatient = async (req, res) => {
  await prisma.user.delete({ where: { id: idParam(req) } });
  res.json({ ok: true });
};

exports.messagePatient = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: idParam(req) } });
  if (!user) throw new HttpError(404, 'Bemor topilmadi');
  const text = str(req.body?.text, 3500);
  if (!text) throw new HttpError(400, 'Xabar matnini kiriting');
  if (!user.telegramId) throw new HttpError(400, "Bemor Telegram botga ulanmagan");
  const ok = await notify.customMessage(user, text);
  if (!ok) throw new HttpError(400, 'Xabar yuborilmadi: bemor botni bloklagan bo\'lishi mumkin');
  res.json({ ok: true });
};

exports.sendCheckupReminder = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: idParam(req) } });
  if (!user) throw new HttpError(404, 'Bemor topilmadi');
  if (!user.telegramId) throw new HttpError(400, 'Bemor Telegram botga ulanmagan');
  const months = user.lastVisitAt ? time.monthsBetween(user.lastVisitAt) : null;
  const ok = await notify.checkupReminder(user, { months });
  if (!ok) throw new HttpError(400, 'Xabar yuborilmadi: bemor botni bloklagan bo\'lishi mumkin');
  await prisma.user.update({ where: { id: user.id }, data: { lastCheckupReminderAt: new Date() } });
  res.json({ ok: true });
};

// ======================= KATEGORIYALAR =======================

function categoryData(body) {
  const nameUz = str(body.nameUz, 80);
  const nameRu = str(body.nameRu, 80);
  if (!nameUz || !nameRu) throw new HttpError(400, 'Kategoriya nomini ikkala tilda kiriting');
  return { nameUz, nameRu, icon: optStr(body.icon, 8), sortOrder: int(body.sortOrder, 0) };
}

exports.listCategories = async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy, include: { _count: { select: { services: true } } } });
  res.json({ items: categories });
};

exports.createCategory = async (req, res) => {
  const category = await prisma.category.create({ data: categoryData(req.body || {}) });
  catalog.invalidate();
  res.status(201).json({ category });
};

exports.updateCategory = async (req, res) => {
  const category = await prisma.category.update({ where: { id: idParam(req) }, data: categoryData(req.body || {}) });
  catalog.invalidate();
  res.json({ category });
};

exports.deleteCategory = async (req, res) => {
  await prisma.category.delete({ where: { id: idParam(req) } });
  catalog.invalidate();
  res.json({ ok: true });
};

// ======================= XIZMATLAR =======================

function serviceData(body) {
  const nameUz = str(body.nameUz, 150);
  const nameRu = str(body.nameRu, 150);
  if (!nameUz || !nameRu) throw new HttpError(400, 'Xizmat nomini ikkala tilda kiriting');
  const price = int(body.price, 0);
  if (price < 0) throw new HttpError(400, "Narx manfiy bo'lishi mumkin emas");
  const oldPrice = int(body.oldPrice);

  return {
    nameUz,
    nameRu,
    descriptionUz: optStr(body.descriptionUz, 3000),
    descriptionRu: optStr(body.descriptionRu, 3000),
    aftercareUz: optStr(body.aftercareUz, 3000),
    aftercareRu: optStr(body.aftercareRu, 3000),
    price,
    oldPrice: oldPrice && oldPrice > 0 ? oldPrice : null,
    priceFrom: bool(body.priceFrom),
    durationMin: clamp(int(body.durationMin, 30), 5, 600),
    imageUrl: optStr(body.imageUrl, 500),
    isPopular: bool(body.isPopular),
    isActive: bool(body.isActive, true),
    sortOrder: int(body.sortOrder, 0),
    categoryId: int(body.categoryId) || null,
  };
}

const idList = (value) => (Array.isArray(value) ? value.map((v) => int(v)).filter(Boolean) : []);

exports.listServices = async (req, res) => {
  const services = await prisma.service.findMany({
    orderBy,
    include: {
      category: true,
      doctors: { select: { id: true, fullName: true } },
      _count: { select: { appointments: true } },
    },
  });
  res.json({ items: services });
};

exports.createService = async (req, res) => {
  const service = await prisma.service.create({
    data: {
      ...serviceData(req.body || {}),
      doctors: { connect: idList(req.body?.doctorIds).map((id) => ({ id })) },
    },
  });
  catalog.invalidate();
  res.status(201).json({ service });
};

exports.updateService = async (req, res) => {
  const service = await prisma.service.update({
    where: { id: idParam(req) },
    data: {
      ...serviceData(req.body || {}),
      doctors: { set: idList(req.body?.doctorIds).map((id) => ({ id })) },
    },
  });
  catalog.invalidate();
  res.json({ service });
};

exports.deleteService = async (req, res) => {
  const id = idParam(req);
  const used = await prisma.appointment.count({ where: { serviceId: id } });
  catalog.invalidate();
  if (used) {
    await prisma.service.update({ where: { id }, data: { isActive: false } });
    return res.json({ ok: true, deactivated: true });
  }
  await prisma.service.delete({ where: { id } });
  return res.json({ ok: true });
};

// ======================= SHIFOKORLAR =======================

function doctorData(body) {
  const fullName = str(body.fullName, 120);
  const specialtyUz = str(body.specialtyUz, 120);
  const specialtyRu = str(body.specialtyRu, 120);
  if (!fullName) throw new HttpError(400, 'Shifokorning ism-familiyasini kiriting');
  if (!specialtyUz || !specialtyRu) throw new HttpError(400, 'Mutaxassislikni ikkala tilda kiriting');
  const color = /^#[0-9a-f]{6}$/i.test(body.color || '') ? body.color : '#2563eb';

  return {
    fullName,
    specialtyUz,
    specialtyRu,
    bioUz: optStr(body.bioUz, 2000),
    bioRu: optStr(body.bioRu, 2000),
    photoUrl: optStr(body.photoUrl, 500),
    experienceYears: clamp(int(body.experienceYears, 0), 0, 70),
    color,
    isActive: bool(body.isActive, true),
    sortOrder: int(body.sortOrder, 0),
    schedule: Doctor.normalizeSchedule(body.schedule),
  };
}

exports.listDoctors = async (req, res) => {
  const [doctors, ratings] = await Promise.all([
    prisma.doctor.findMany({
      orderBy,
      include: {
        services: { select: { id: true, nameUz: true } },
        _count: { select: { appointments: true } },
      },
    }),
    Doctor.ratings(),
  ]);
  res.json({
    items: doctors.map((d) => ({ ...d, rating: ratings[d.id]?.avg ?? null, ratingCount: ratings[d.id]?.count ?? 0 })),
  });
};

exports.createDoctor = async (req, res) => {
  const doctor = await prisma.doctor.create({
    data: {
      ...doctorData(req.body || {}),
      services: { connect: idList(req.body?.serviceIds).map((id) => ({ id })) },
    },
  });
  catalog.invalidate();
  res.status(201).json({ doctor });
};

exports.updateDoctor = async (req, res) => {
  const doctor = await prisma.doctor.update({
    where: { id: idParam(req) },
    data: {
      ...doctorData(req.body || {}),
      services: { set: idList(req.body?.serviceIds).map((id) => ({ id })) },
    },
  });
  catalog.invalidate();
  res.json({ doctor });
};

exports.deleteDoctor = async (req, res) => {
  const id = idParam(req);
  const used = await prisma.appointment.count({ where: { doctorId: id } });
  catalog.invalidate();
  if (used) {
    await prisma.doctor.update({ where: { id }, data: { isActive: false } });
    return res.json({ ok: true, deactivated: true });
  }
  await prisma.doctor.delete({ where: { id } });
  return res.json({ ok: true });
};

// ======================= DAM OLISH KUNLARI =======================

exports.listTimeOffs = async (req, res) => {
  const from = time.addDays(time.nowLocal().date, -30);
  const items = await prisma.timeOff.findMany({
    where: { dateTo: { gte: from } },
    orderBy: { dateFrom: 'asc' },
    include: { doctor: { select: { id: true, fullName: true, color: true } } },
  });
  res.json({ items });
};

exports.createTimeOff = async (req, res) => {
  const body = req.body || {};
  const dateFrom = body.dateFrom;
  const dateTo = body.dateTo || body.dateFrom;
  if (!time.isValidDate(dateFrom) || !time.isValidDate(dateTo) || dateTo < dateFrom) {
    throw new HttpError(400, "Sanalar noto'g'ri");
  }
  const timeOff = await prisma.timeOff.create({
    data: { doctorId: int(body.doctorId) || null, dateFrom, dateTo, reason: optStr(body.reason, 200) },
    include: { doctor: { select: { id: true, fullName: true, color: true } } },
  });
  catalog.invalidate();
  res.status(201).json({ timeOff });
};

exports.deleteTimeOff = async (req, res) => {
  await prisma.timeOff.delete({ where: { id: idParam(req) } });
  catalog.invalidate();
  res.json({ ok: true });
};

// ======================= XABARNOMA =======================

exports.broadcastAudience = async (req, res) => {
  const base = { telegramId: { not: null }, isBlocked: false };
  const [uz, ru] = await Promise.all([
    prisma.user.count({ where: { ...base, language: { not: 'ru' } } }),
    prisma.user.count({ where: { ...base, language: 'ru' } }),
  ]);
  res.json({ uz, ru, total: uz + ru });
};

exports.listBroadcasts = async (req, res) => {
  const items = await prisma.broadcast.findMany({ orderBy: { id: 'desc' }, take: 30 });
  res.json({ items });
};

exports.createBroadcast = async (req, res) => {
  const textUz = str(req.body?.textUz, 4000);
  const textRu = str(req.body?.textRu, 4000);
  if (!textUz && !textRu) throw new HttpError(400, 'Xabar matnini kiriting');

  const active = await prisma.broadcast.findFirst({ where: { status: 'SENDING' } });
  if (active) throw new HttpError(409, 'Oldingi xabarnoma hali yuborilmoqda');

  const broadcast = await prisma.broadcast.create({
    data: { textUz: textUz || textRu, textRu: textRu || textUz, createdBy: req.admin.fullName },
  });
  broadcaster.run(broadcast.id).catch(async (err) => {
    console.error('Xabarnoma xatosi:', err.message);
    await prisma.broadcast.update({ where: { id: broadcast.id }, data: { status: 'DONE' } }).catch(() => {});
  });
  res.status(201).json({ broadcast });
};

// ======================= SOZLAMALAR =======================

exports.getSettings = async (req, res) => {
  const settings = await prisma.clinic.findUnique({ where: { id: 1 } });
  res.json({ settings });
};

exports.updateSettings = async (req, res) => {
  const body = req.body || {};
  const required = (field, label, max = 300) => {
    const value = str(body[field], max);
    if (!value) throw new HttpError(400, `${label} kiritilmagan`);
    return value;
  };
  const latitude = float(body.latitude);
  const longitude = float(body.longitude);

  const data = {
    name: required('name', 'Klinika nomi', 120),
    phone: required('phone', 'Telefon raqam', 40),
    phone2: optStr(body.phone2, 40),
    addressUz: required('addressUz', "Manzil (o'zbekcha)"),
    addressRu: required('addressRu', 'Manzil (ruscha)'),
    landmarkUz: optStr(body.landmarkUz, 300),
    landmarkRu: optStr(body.landmarkRu, 300),
    latitude: latitude !== null && Math.abs(latitude) <= 90 ? latitude : null,
    longitude: longitude !== null && Math.abs(longitude) <= 180 ? longitude : null,
    workingHoursUz: required('workingHoursUz', "Ish vaqti (o'zbekcha)"),
    workingHoursRu: required('workingHoursRu', 'Ish vaqti (ruscha)'),
    aboutUz: optStr(body.aboutUz, 2000),
    aboutRu: optStr(body.aboutRu, 2000),
    instagram: optStr(body.instagram, 200),
    telegram: optStr(body.telegram, 200),
    slotStepMin: clamp(int(body.slotStepMin, 30), 5, 240),
    bookingDaysAhead: clamp(int(body.bookingDaysAhead, 30), 1, 180),
    minLeadMinutes: clamp(int(body.minLeadMinutes, 60), 0, 1440),
    cancelLimitHours: clamp(int(body.cancelLimitHours, 3), 0, 72),
    autoConfirm: bool(body.autoConfirm),
    remindDayBefore: bool(body.remindDayBefore, true),
    remindHoursBefore: bool(body.remindHoursBefore, true),
    checkupEnabled: bool(body.checkupEnabled, true),
    checkupIntervalMonths: clamp(int(body.checkupIntervalMonths, 6), 1, 24),
  };

  const settings = await Clinic.update(data);
  catalog.invalidate();
  res.json({ settings });
};

exports.system = async (req, res) => {
  const demoPatients = await prisma.user.count({ where: { isDemo: true } });
  res.json({
    botUsername: config.runtime.botUsername,
    botOk: config.runtime.botOk,
    webAppUrl: config.runtime.webAppUrl,
    devAuth: config.devAuth,
    demoPatients,
  });
};

exports.clearDemo = async (req, res) => {
  const result = await prisma.user.deleteMany({ where: { isDemo: true } });
  catalog.invalidate();
  res.json({ deleted: result.count });
};

// ======================= XODIMLAR =======================

exports.listAdmins = async (req, res) => {
  const items = await prisma.admin.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, username: true, fullName: true, createdAt: true },
  });
  res.json({ items });
};

exports.createAdmin = async (req, res) => {
  const username = str(req.body?.username, 30).toLowerCase();
  const fullName = str(req.body?.fullName, 80);
  const password = String(req.body?.password || '');
  if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
    throw new HttpError(400, "Login kamida 3 ta belgi: lotin harflari, raqam, _ yoki .");
  }
  if (!fullName) throw new HttpError(400, 'Xodimning ismini kiriting');
  if (password.length < 6) throw new HttpError(400, "Parol kamida 6 ta belgidan iborat bo'lishi kerak");

  const exists = await prisma.admin.findUnique({ where: { username } });
  if (exists) throw new HttpError(409, 'Bunday login band');

  const admin = await prisma.admin.create({
    data: { username, fullName, passwordHash: hashPassword(password) },
    select: { id: true, username: true, fullName: true, createdAt: true },
  });
  res.status(201).json({ admin });
};

exports.deleteAdmin = async (req, res) => {
  const id = idParam(req);
  if (id === req.admin.id) throw new HttpError(400, "O'zingizni o'chira olmaysiz");
  const count = await prisma.admin.count();
  if (count <= 1) throw new HttpError(400, "Oxirgi administratorni o'chirib bo'lmaydi");
  await prisma.admin.delete({ where: { id } });
  forgetAdmin(id);
  res.json({ ok: true });
};

exports.changePassword = async (req, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.admin.id } });
  if (!admin || !verifyPassword(String(req.body?.currentPassword || ''), admin.passwordHash)) {
    throw new HttpError(400, "Joriy parol noto'g'ri");
  }
  const next = String(req.body?.newPassword || '');
  if (next.length < 6) throw new HttpError(400, "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak");
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: hashPassword(next) } });
  res.json({ ok: true });
};

// ======================= RASM YUKLASH =======================

exports.upload = async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Faqat rasm fayllari (JPG, PNG, WEBP) qabul qilinadi');
  const media = await prisma.media.create({
    data: { mimeType: req.file.mimetype, size: req.file.size, data: req.file.buffer },
    select: { id: true },
  });
  res.status(201).json({ url: `/api/media/${media.id}` });
};
