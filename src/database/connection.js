require('../config/default');
const { PrismaClient } = require('@prisma/client');

// Neon bazasi bo'sh turganda "uxlab qoladi" va ulanishlarni uzadi.
// Bunday xatolarda so'rov bir necha marta avtomatik qayta yuboriladi.
const RETRYABLE = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);
const MAX_ATTEMPTS = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const base = new PrismaClient({ log: ['warn'] });

const prisma = base.$extends({
  query: {
    async $allOperations({ args, query }) {
      for (let attempt = 1; ; attempt += 1) {
        try {
          return await query(args);
        } catch (err) {
          if (attempt >= MAX_ATTEMPTS || !RETRYABLE.has(err?.code)) throw err;
          await sleep(500 * attempt);
        }
      }
    },
  },
});

async function connect() {
  await base.$connect();
}

async function disconnect() {
  await base.$disconnect();
}

module.exports = { prisma, connect, disconnect };
