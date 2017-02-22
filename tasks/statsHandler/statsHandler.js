const sqlite3 = require('sqlite3');

let db;
let config;
let client;
const hourlyMsgCount = {};
let myBot;

function handleMessage() {
  return (message) => {
    if (message.channel.type === 'text') {
      if (message.channel.name in hourlyMsgCount) {
        hourlyMsgCount[message.channel.name] += 1;
      } else {
        hourlyMsgCount[message.channel.name] = 1;
      }
    }
  };
}

function initDatabase() {
  db.run('CREATE TABLE IF NOT EXISTS ChannelStats(' +
    'ID              INTEGER PRIMARY  KEY AUTOINCREMENT NOT NULL,' +
    'Name            TEXT  NOT NULL,' +
    'Date            TIMESTAMP   default (datetime(\'now\')),' +
    'MsgsPerHour   INTEGER   NOT NULL);');

  db.run('CREATE TABLE IF NOT EXISTS Members(' +
    'ID              INTEGER PRIMARY  KEY AUTOINCREMENT NOT NULL,' +
    'Date            TIMESTAMP   default (datetime(\'now\')),' +
    'MembersOnline            TIMESTAMP   default (datetime(\'now\')),' +
    'Count           INTEGER   NOT NULL);');

  db.run('CREATE TABLE IF NOT EXISTS DailyChannelStats(' +
    'ID              INTEGER PRIMARY  KEY AUTOINCREMENT NOT NULL,' +
    'Name            TEXT  NOT NULL,' +
    'Date            TIMESTAMP   default (datetime(\'now\')),' +
    'AvgMsgsPerHour           INTEGER   NOT NULL);');
}

function getMembersOnline() {
  // Gotta be a better way to do this...
  let onlineCount = 0;
  Object.keys(client.users.array()).forEach((value) => {
    if (client.users.array()[value].presence.status === 'online') {
      onlineCount += 1;
    }
  });

  return onlineCount;
}

function publishDailyAverage(stats) {
  Object.keys(stats).forEach((channel) => {
    db.run('INSERT INTO DailyChannelStats(Name,AvgMsgsPerHour) values(?,?);',
    [channel, stats[channel]]);
  });
  // Clear out the old data to save space, it's essentially daily temporary storage
  db.run('DELETE FROM ChannelStats');
}

function calculateDailyAverage() {
  const dailyStats = {};
  const numChannels = myBot.getTextChannelCount();
  let channelCount = 0;

  // Go through each channel and figure out the average messages per hour
  client.channels.forEach((item) => {
    if (item.type === 'text') {
      dailyStats[item.name] = { sum: 0, count: 0 };

      // TODO nick the date between is redundant if we are clearing out the table anyway
      db.all('SELECT MsgsPerHour FROM ChannelStats WHERE Name=?', item.name, (err, rows) => {
        channelCount += 1;

        rows.forEach((row) => {
          dailyStats[item.name].sum += row.MsgsPerHour;
          dailyStats[item.name].count += 1;
        });

        if (channelCount === numChannels) {
          const dailyAverage = {};
          Object.keys(dailyStats).forEach((channel) => {
            if (dailyStats[channel].count !== 0) {
              dailyAverage[channel] = parseInt(dailyStats[channel].sum / dailyStats[channel].count, 10);
            } else {
              dailyAverage[channel] = 0;
            }
          });

          publishDailyAverage(dailyAverage);
        }
      });
    }
  });
}

function updateDatabase() {
  client.channels.forEach((item) => {
    if (item.type === 'text') {
      if (item.name in hourlyMsgCount) {
        db.run('INSERT INTO ChannelStats(Name,MsgsPerHour) VALUES(?,?);',
        [item.name, hourlyMsgCount[item.name]]);
        hourlyMsgCount[item.name] = 0;
      }
    }
  }, this);

  db.run('INSERT INTO Members(MembersOnline,Count) VALUES(?,?);', getMembersOnline(), client.users.size);
}

module.exports = {
  init: (bot) => {
    myBot = bot;
    client = bot.client;
    config = bot.settings.stats;
    db = new sqlite3.Database('statistics.db');
    client.on('message', handleMessage());
    initDatabase();
    setInterval(updateDatabase, config.timeIntervalSec * 1000);
    setInterval(calculateDailyAverage, 30000); // 86400000 Milliseconds in a day
  },
};
