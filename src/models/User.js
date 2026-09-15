const { prisma } = require('../database/connection');
const { normalizePhone } = require('../utils/phone');

const displayName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Mijoz';

function findByTelegramId(telegramId) {
  return prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
}

// Telegram foydalanuvchisini topadi yoki yangi yaratadi
async function findOrCreateFromTelegram(from) {
  const telegramId = String(from.id);
  const username = from.username || null;
  const existing = await prisma.user.findUnique({ where: { telegramId } });

  if (existing) {
    if (existing.username !== username || existing.isBlocked) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: { username, isBlocked: false },
      });
      return { user, created: false };
    }
    return { user: existing, created: false };
  }

  const language = String(from.language_code || '').startsWith('ru') ? 'ru' : 'uz';
  try {
    const user = await prisma.user.create({
      data: {
        telegramId,
        username,
        firstName: from.first_name || 'Mijoz',
        lastName: from.last_name || null,
        language,
      },
    });
    return { user, created: true };
  } catch (err) {
    if (err.code === 'P2002') {
      return { user: await prisma.user.findUnique({ where: { telegramId } }), created: false };
    }
    throw err;
  }
}

// Bot orqali tasdiqlangan raqamni saqlaydi. Agar admin shu raqam bilan
// oldin (telefon orqali) bemor qo'shgan bo'lsa — tarixi birlashtiriladi.
async function attachVerifiedPhone(from, rawPhone) {
  const phone = normalizePhone(rawPhone);
  const { user } = await findOrCreateFromTelegram(from);
  if (!phone) return user;

  return prisma.$transaction(async (tx) => {
    const offline = await tx.user.findFirst({
      where: { phone, telegramId: null, isDemo: false, id: { not: user.id } },
      orderBy: { createdAt: 'asc' },
    });

    if (!offline) {
      return tx.user.update({ where: { id: user.id }, data: { phone } });
    }

    await tx.appointment.updateMany({ where: { userId: offline.id }, data: { userId: user.id } });
    await tx.user.delete({ where: { id: offline.id } });

    const lastVisitAt = [offline.lastVisitAt, user.lastVisitAt]
      .filter(Boolean)
      .sort((a, b) => b - a)[0] || null;

    return tx.user.update({
      where: { id: user.id },
      data: {
        phone,
        firstName: offline.firstName || user.firstName,
        lastName: offline.lastName || user.lastName,
        birthDate: offline.birthDate || user.birthDate,
        notes: offline.notes || user.notes,
        lastVisitAt,
        isDemo: false,
      },
    });
  });
}

function setLanguage(telegramId, language) {
  return prisma.user.update({ where: { telegramId: String(telegramId) }, data: { language } });
}

async function markBlocked(telegramId) {
  await prisma.user.updateMany({ where: { telegramId: String(telegramId) }, data: { isBlocked: true } });
}

async function refreshLastVisit(userId) {
  const last = await prisma.appointment.findFirst({
    where: { userId, status: 'COMPLETED' },
    orderBy: { startAt: 'desc' },
    select: { startAt: true },
  });
  await prisma.user.update({ where: { id: userId }, data: { lastVisitAt: last ? last.startAt : null } });
}

module.exports = {
  displayName,
  findByTelegramId,
  findOrCreateFromTelegram,
  attachVerifiedPhone,
  setLanguage,
  markBlocked,
  refreshLastVisit,
};
