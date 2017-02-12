const test = require('tape');
const TheAwesomeBot = require('../TheAwesomeBot');

const token = process.env.DISCORD_TOKEN || require('../tokens.json').discord; // eslint-disable-line global-require

test('connect & disconnect', (t) => {
  t.timeoutAfter(15000);
  t.ok(token, 'discord token should be set');

  const bot = new TheAwesomeBot(token);
  t.false(bot.isReady, 'bot should not be ready');
  bot.init();
  // wait for it to be ready
  const si = setInterval(() => {
    if (bot.isReady) {
      bot.deinit().then(() => {
        clearInterval(si);
        t.end();
      });
    }
  }, 5000);
});
