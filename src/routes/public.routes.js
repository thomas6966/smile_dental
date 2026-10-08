const { Router } = require('express');
const config = require('../config/default');
const { prisma } = require('../database/connection');

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    bot: config.runtime.botOk,
    mode: config.botMode,
    webAppUrl: config.runtime.webAppUrl || null,
  });
});

// Admin Paneldan yuklangan rasmlar bazada saqlanadi
router.get('/media/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).end();

  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return res.status(404).end();

  res.set({
    'Content-Type': media.mimeType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'X-Content-Type-Options': 'nosniff',
  });
  return res.send(Buffer.from(media.data));
});

module.exports = router;
