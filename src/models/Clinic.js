const { prisma } = require('../database/connection');

const TTL = 30 * 1000;
let cache = null;
let cachedAt = 0;

async function get() {
  if (cache && Date.now() - cachedAt < TTL) return cache;
  cache = await prisma.clinic.findUnique({ where: { id: 1 } });
  cachedAt = Date.now();
  return cache;
}

async function update(data) {
  cache = await prisma.clinic.update({ where: { id: 1 }, data });
  cachedAt = Date.now();
  return cache;
}

function mapUrl(clinic) {
  if (!clinic || clinic.latitude == null || clinic.longitude == null) return null;
  return `https://maps.google.com/?q=${clinic.latitude},${clinic.longitude}`;
}

// Mini App uchun ochiq ma'lumotlar
function toPublic(clinic) {
  if (!clinic) return null;
  return {
    name: clinic.name,
    phone: clinic.phone,
    phone2: clinic.phone2,
    addressUz: clinic.addressUz,
    addressRu: clinic.addressRu,
    landmarkUz: clinic.landmarkUz,
    landmarkRu: clinic.landmarkRu,
    latitude: clinic.latitude,
    longitude: clinic.longitude,
    mapUrl: mapUrl(clinic),
    workingHoursUz: clinic.workingHoursUz,
    workingHoursRu: clinic.workingHoursRu,
    aboutUz: clinic.aboutUz,
    aboutRu: clinic.aboutRu,
    instagram: clinic.instagram,
    telegram: clinic.telegram,
    slotStepMin: clinic.slotStepMin,
    bookingDaysAhead: clinic.bookingDaysAhead,
    cancelLimitHours: clinic.cancelLimitHours,
    checkupIntervalMonths: clinic.checkupIntervalMonths,
  };
}

module.exports = { get, update, mapUrl, toPublic };
