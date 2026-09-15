const { Bot } = require('grammy');
const config = require('../config/default');

if (!config.botToken) {
  throw new Error(".env faylida BOT_TOKEN ko'rsatilmagan");
}

const bot = new Bot(config.botToken);

module.exports = bot;
