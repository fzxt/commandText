let db;
let client;
const sqlite3 = require('sqlite3');


module.exports = {
  usage: [
    'Get server statistics',
    'stats <channel> - list statistics for specific channel',
  ],
  run: (bot, message, cmdArgs) => {
    const numChannels = bot.getTextChannelCount();
    let channelCount = 0;
    let msgBody = '```Messages per hour\n-----------\n';

    client.channels.forEach((item) => {
      if (item.type === 'text') {
        db.all('SELECT AVG_MSGS_PER_HOUR FROM DailyChannelStats WHERE NAME=? order by DATE DESC LIMIT 1', item.name,
          (err, rows) => {
            console.log(rows);
            channelCount += 1;
            msgBody += item.name + ':' + rows[0].AVG_MSGS_PER_HOUR + '\n';

            if (channelCount === numChannels) {
              message.channel.sendMessage(msgBody + '```');
            }
          });
      }
    });
    return false;
  },
  init: (bot) => {
    db = new sqlite3.Database('statistics.db');
    client = bot.client;
  },
};
