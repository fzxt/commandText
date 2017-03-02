const sqlite3 = require('sqlite3');

let db;
let config;
let client;
const hourlyMsgCount = {};

function getDateTime() {

    var date = new Date();

    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;

    return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

}

function handleMessage(message) {
  if (!message.member.user.bot) {
    if (message.channel.type === 'text') {
      if (message.channel.name in hourlyMsgCount) {
        hourlyMsgCount[message.channel.name] += 1;
      } else {
        hourlyMsgCount[message.channel.name] = 1;
      }

      // Count overall messages per server as well
      if('overall' in hourlyMsgCount) {
        hourlyMsgCount['overall'] += 1;
      } else {
        hourlyMsgCount['overall'] = 1;
      }
    }

    const id = message.member.user.id;
    console.log(getDateTime() + ' ' + message.member.user.username + ' ' + id);
//      db.run('INSERT INTO Leaderboard(Name) VALUES(?)', id);
  }
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
    'MembersOnline   INTEGER NOT NULL,' +
    'Count           INTEGER   NOT NULL);');

  db.run('CREATE TABLE IF NOT EXISTS Leaderboard(' +
    'ID              INTEGER PRIMARY  KEY AUTOINCREMENT NOT NULL,' +
    'Date            TIMESTAMP   default (datetime(\'now\')),' +
    'Name            TEXT NOT NULL);');
}

function updateUserAverage(userId, currentAvg, currentCount, newMsgs) {
  const newSum = (currentAvg * currentCount) + newMsgs;
  const newAvg = parseInt(newSum / (currentCount + 1), 10);
  db.run('REPLACE INTO Leaderboard(Name,Count,AvgMsgs) VALUES(?,?,?)', [userId, currentCount + 1, newAvg]);
}

function getMembersOnline() {
  return client.users.filter(user => user.presence.status !== 'offline').size;
}

function updateLeaderboard() {
  // Delete any entries more than a day old
  db.run('DELETE FROM Leaderboard WHERE Date NOT BETWEEN datetime(\'now\',\'-1 day\') AND datetime(\'now\');')
}


function updateDatabase() {
  client.channels.forEach((item) => {
    if (item.type === 'text') {
      if (!(item.name in hourlyMsgCount)) {
        hourlyMsgCount[item.name] = 0;
      }
      db.run('INSERT INTO ChannelStats(Name,MsgsPerHour) VALUES(?,?);',
      [item.name, hourlyMsgCount[item.name]]);
      hourlyMsgCount[item.name] = 0;
    }
  }, this);

  // Update overall server stats
  // Sort of hacky, but eh
  if (!('overall' in hourlyMsgCount)) {
    hourlyMsgCount['overall'] = 0;
  }

  db.run('INSERT INTO ChannelStats(Name,MsgsPerHour) VALUES(?,?);',
    ['overall', hourlyMsgCount['overall']]);
    hourlyMsgCount['overall'] = 0;


  db.run('INSERT INTO Members(MembersOnline,Count) VALUES(?,?);', getMembersOnline(), client.users.size);
}

module.exports = {
  init: (bot) => {
    client = bot.client;
    config = bot.settings.stats;
    db = new sqlite3.Database('statistics.db');
    db.configure('busyTimeout', 2000); // 2 second busy timeout
    initDatabase();
    setInterval(updateDatabase, config.timeIntervalSec * 1000);
    setInterval(updateLeaderboard, 10000); // Every 10 seconds, check if it's time to update the daily leaderboard
  },
  handleMessage: (message) => {
    handleMessage(message);
  },
};
