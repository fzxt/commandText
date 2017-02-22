let db;
let client;
const sqlite3 = require('sqlite3');

function getStats(channelName, message) {
  db.all('SELECT AvgMsgsPerHour FROM DailyChannelStats WHERE NAME=? order by Date DESC LIMIT 1', channelName,
  (err, rows) => {
    if (rows.length > 0) {
      const msgBody = '```Messages per hour\n-----------\n' + channelName + ': ' + rows[0].AvgMsgsPerHour + '```';
      message.channel.sendMessage(msgBody);
    } else {
      message.channel.sendMessage('`Could not find channel: ' + channelName + '`');
    }
  });
}

function getStatsAllChannels(numChannels, message) {
  let msgBody = '```Messages per hour\n-----------\n';
  let channelCount = 0;
  client.channels.forEach((item) => {
    if (item.type === 'text') {
      db.all('SELECT AvgMsgsPerHour FROM DailyChannelStats WHERE Name=? order by Date DESC LIMIT 1', item.name,
        (err, rows) => {
          channelCount += 1;
          msgBody += item.name + ':' + rows[0].AvgMsgsPerHour + '\n';

          if (channelCount === numChannels) {
            message.channel.sendMessage(msgBody + '```');
          }
        });
    }
  });
}

function getUserStats(message) {
  // let msgBody = '```';

  // db.all('SELECT Count,Date FROM Members ORDER BY Date DESC', item.name,
  //   (err, rows) => {
  //     channelCount += 1;
  //     msgBody += item.name + ':' + rows[0].AvgMsgsPerHour + '\n';

  //     if (channelCount === numChannels) {
  //       message.channel.sendMessage(msgBody + '```');
  //     }
  //   });

}

module.exports = {
  usage: [
    'Get server statistics',
    'stats <channel> - list statistics for specific channel',
    'stats hourly - list most recent hourly stats',
    'stats daily - list stats for the past 24 hours',
    'stats weekly - list stats for the past week',
    'stats monthly - list stats for the past month',
    'stats users - list stats on total users',
  ],
  run: (bot, message, cmdArgs) => {
    if (cmdArgs.length > 0) {
      if (cmdArgs === 'users') {
        getUserStats(message);
      } else {
        getStats(cmdArgs.split(' ')[0], message);
      }
    } else {
      getStatsAllChannels(bot.getTextChannelCount(), message);
    }
    return false;
  },
  init: (bot) => {
    db = new sqlite3.Database('statistics.db');
    client = bot.client;
  },
};
