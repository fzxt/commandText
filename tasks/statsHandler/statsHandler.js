const sqlite3 = require('sqlite3');

let db;
let config;
let client;
let hourlyMsgCount = {};
let myBot;

function handleMessage() {
  return (message) => {
    console.log("got msg in stats");
    if (message.channel.type === 'text') {
      console.log(message.channel.name);
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
    'NAME            TEXT  NOT NULL,' +
    'DATE            TIMESTAMP   default (strftime(\'%s\', \'now\')),' +
    'MSGS_PER_HOUR   INTEGER   NOT NULL);');

  db.run('CREATE TABLE IF NOT EXISTS Members(' +
    'ID              INTEGER PRIMARY  KEY AUTOINCREMENT NOT NULL,' +
    'DATE            TIMESTAMP   default (strftime(\'%s\', \'now\')),' +
    'COUNT           INTEGER   NOT NULL);');

  db.run('CREATE TABLE IF NOT EXISTS DailyChannelStats(' +
    'ID              INTEGER PRIMARY  KEY AUTOINCREMENT NOT NULL,' +
    'NAME            TEXT  NOT NULL,' +
    'DATE            TIMESTAMP   default (strftime(\'%s\', \'now\')),' +
    'AVG_MSGS_PER_HOUR           INTEGER   NOT NULL);');
}

function publishDailyAverage(stats) {
  console.log(stats);
  for (channel in stats) {
    db.run('INSERT INTO DailyChannelStats(NAME,AVG_MSGS_PER_HOUR) values(?,?);',
    [channel, stats[channel]]);
  }

  // Clear out the old data to save space, it's essentially daily temporary storage
  db.run('DELETE FROM ChannelStats');
}

function calculateDailyAverage() {
  let dailyStats={};
  console.log("Updating averages");
  const numChannels = myBot.getTextChannelCount();
  let channelCount = 0;

  // Go through each channel and figure out the average messages per hour
  client.channels.forEach(function add(item) {
    if (item.type === 'text') {
      dailyStats[item.name] = {'sum': 0, 'count': 0};
      console.log("Selecting for ", item.name );

      // TODO nick the date between is redundant if we are clearing out the table anyway
      db.all('SELECT MSGS_PER_HOUR FROM ChannelStats WHERE NAME=? AND DATE BETWEEN strftime(\'%s\', \'now\', \'-1 day\') AND strftime(\'%s\', \'now\')',item.name, function(err, rows) {
        channelCount += 1;
        console.log('Got results for: ' + item.name + ' count: ' + channelCount);

        rows.forEach( function(row) {
          dailyStats[item.name]["sum"] += row.MSGS_PER_HOUR;
          dailyStats[item.name]["count"] += 1;
        });

        if(channelCount === numChannels) {
          console.log("Done");
          let dailyAverage = {};

          for( channel in dailyStats )
          {
            if( dailyStats[channel]["count"] != 0 ) {
              dailyAverage[channel] = parseInt(dailyStats[channel]["sum"] / dailyStats[channel]["count"]);
            } else {
              dailyAverage[channel] = 0;
            }
          }
          publishDailyAverage(dailyAverage);
        }
      });
    }
  });
}

function updateDatabase() {
  // TODO only update if the counts have changed from last time
  // Grab the total number of users
  console.log("updating db");
  const totalUsers = client.users.size;
  db.run('INSERT INTO Members(COUNT) values(?);', totalUsers);

  client.channels.forEach(function add(item) {
    if (item.type === 'text') {
      if (item.name in hourlyMsgCount) {
        db.run('INSERT INTO ChannelStats(NAME,MSGS_PER_HOUR) values(?,?);',
        [item.name, hourlyMsgCount[item.name]]);
        hourlyMsgCount[item.name] = 0;
      }
    }
  }, this);
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
    setInterval(calculateDailyAverage, 60000); // 86400000 Milliseconds in a day
  },
};
