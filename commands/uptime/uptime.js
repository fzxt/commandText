module.exports = {
  usage: 'uptime - prints my uptime',
  run: (bot, message) => {
    message.channel.sendMessage(`Uptime: ${bot.getUptime()}`);
  },
};
