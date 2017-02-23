const sqlite3 = require('sqlite3');

let db;
let config;
let client;
const hourlyMsgCount = {};

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
}

function getMembersOnline() {
  return client.users.filter(user => user.presence.status === 'online').size;
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
    client = bot.client;
    config = bot.settings.stats;
    db = new sqlite3.Database('statistics.db');
    client.on('message', handleMessage());
    initDatabase();
    setInterval(updateDatabase, config.timeIntervalSec * 1000);
  },
};
