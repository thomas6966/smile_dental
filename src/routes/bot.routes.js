const bot = require('../core/bot');
const ctrl = require('../controllers/botController');
const { both } = require('../locales');

function registerBotRoutes() {
  bot.command('start', ctrl.start);
  bot.command(['lang', 'language'], ctrl.askLanguage);
  bot.command('menu', ctrl.menu);

  bot.callbackQuery(/^lang:(uz|ru)$/, ctrl.setLanguage);
  bot.callbackQuery(/^rate:(\d+):([1-5])$/, ctrl.rate);
  bot.callbackQuery(/^attend:(\d+)$/, ctrl.attend);
  bot.callbackQuery(/^cancel:(\d+)$/, ctrl.askCancel);
  bot.callbackQuery(/^cancelyes:(\d+)$/, ctrl.cancelYes);
  bot.callbackQuery(/^cancelno:(\d+)$/, ctrl.cancelNo);

  bot.on('message:contact', ctrl.contact);

  bot.hears(both((L) => L.menu.book), ctrl.book);
  bot.hears(both((L) => L.menu.appointments), ctrl.appointments);
  bot.hears(both((L) => L.menu.history), ctrl.history);
  bot.hears(both((L) => L.menu.services), ctrl.services);
  bot.hears(both((L) => L.menu.doctors), ctrl.doctors);
  bot.hears(both((L) => L.menu.contacts), ctrl.contacts);
  bot.hears(both((L) => L.menu.language), ctrl.askLanguage);

  bot.on('message:text', ctrl.text);
  bot.on('callback_query:data', (ctx) => ctx.answerCallbackQuery());

  bot.catch((err) => {
    const e = err.error || err;
    console.error('Bot xatosi:', e.description || e.message || e);
  });
}

module.exports = { registerBotRoutes };
