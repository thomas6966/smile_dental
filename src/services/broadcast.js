const { prisma } = require('../database/connection');
const notify = require('./notify');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Barcha bot foydalanuvchilariga ommaviy xabar (Telegram limiti: ~30 xabar/soniya)
async function run(broadcastId) {
  const broadcast = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
  if (!broadcast) return;

  const users = await prisma.user.findMany({
    where: { telegramId: { not: null }, isBlocked: false },
    select: { id: true, telegramId: true, language: true, isBlocked: true },
  });
  await prisma.broadcast.update({ where: { id: broadcastId }, data: { total: users.length } });

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    const text = user.language === 'ru' ? broadcast.textRu : broadcast.textUz;
    const ok = await notify.sendPlain(user, text);
    if (ok) sent += 1;
    else failed += 1;
    if ((i + 1) % 20 === 0) {
      await prisma.broadcast.update({ where: { id: broadcastId }, data: { sent, failed } });
    }
    await sleep(50);
  }

  await prisma.broadcast.update({ where: { id: broadcastId }, data: { sent, failed, status: 'DONE' } });
}

module.exports = { run };
