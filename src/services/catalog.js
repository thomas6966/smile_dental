const { prisma } = require('../database/connection');
const Service = require('../models/Service');
const Doctor = require('../models/Doctor');
const { nowLocal, addDays } = require('../utils/time');

// Xizmatlar, kategoriyalar, shifokorlar va dam olish kunlari (tezlik uchun keshlanadi)
const TTL = 60 * 1000;
let cache = null;
let cachedAt = 0;
let pending = null;

async function load() {
  const [categories, services, doctors, timeOffs] = await Promise.all([
    Service.listCategories(),
    Service.listActive(),
    Doctor.listActive(),
    prisma.timeOff.findMany({ where: { dateTo: { gte: addDays(nowLocal().date, -1) } } }),
  ]);
  return { categories, services, doctors, timeOffs };
}

async function get() {
  if (cache && Date.now() - cachedAt < TTL) return cache;
  if (!pending) {
    pending = load()
      .then((data) => {
        cache = data;
        cachedAt = Date.now();
        return data;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

function invalidate() {
  cache = null;
}

module.exports = { get, invalidate };
