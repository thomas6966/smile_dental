const { prisma } = require('../database/connection');

// Turlari: NEW_BOOKING, CANCELLED, RESCHEDULED, CONFIRMED, RATED
async function create(type, appointmentId = null) {
  try {
    await prisma.notification.create({ data: { type, appointmentId } });
  } catch (err) {
    console.error('Bildirishnoma saqlanmadi:', err.message);
  }
}

module.exports = { create };
