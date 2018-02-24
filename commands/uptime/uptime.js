const time = require('../../lib/utils.js').time;

module.exports = {
  usage: 'uptime - prints my uptime',
  run: (bot, message) => {
    message.channel.sendMessage(
      `Uptime: ${time.timeElapsed(bot.bootTime, new Date())}`);
  },
};
