const sqlite3 = require('sqlite3');

let db;
let config;
let client;
const hourlyMsgCount = {};

function handleMessage() {
  return (message) => {
    if (!message.member.user.bot) {
      if (message.channel.type === 'text') {
        if (message.channel.name in hourlyMsgCount) {
          hourlyMsgCount[message.channel.name] += 1;
        } else {
          hourlyMsgCount[message.channel.name] = 1;
        }
      }

      const id = message.member.user.id;

      db.all('SELECT Count,Date FROM TempLeaderboard WHERE Name = ?', id,
      (err, rows) => {
        let count = 1;
        let date = 'now';
        if (rows.length > 0) {
          count = rows[0].Count + 1;
          date = rows[0].Date;
        }

        db.run('REPLACE INTO TempLeaderboard(Name,Date,Count) VALUES(?,datetime(\'' + date + '\'),?)', [id, count]);
      });
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
    'MembersOnline   INTEGER NOT NULL,' +
    'Count           INTEGER   NOT NULL);');

  db.run('CREATE TABLE IF NOT EXISTS TempLeaderboard(' +
    'ID              INTEGER PRIMARY  KEY AUTOINCREMENT NOT NULL,' +
    'Date            TIMESTAMP   default (datetime(\'now\')),' +
    'Name            TEXT NOT NULL UNIQUE,' +
    'Count           INTEGER   NOT NULL);');

  db.run('CREATE TABLE IF NOT EXISTS Leaderboard(' +
    'ID              INTEGER PRIMARY  KEY AUTOINCREMENT NOT NULL,' +
    'Date            TIMESTAMP   default (datetime(\'now\')),' +
    'Count            INTEGER NOT NULL,' +
    'Name            TEXT NOT NULL UNIQUE,' +
    'AvgMsgs         INTEGER   NOT NULL);');
}

function updateUserAverage(userId, currentAvg, currentCount, newMsgs) {
  const newSum = (currentAvg * currentCount) + newMsgs;
  const newAvg = parseInt(newSum / (currentCount + 1), 10);
  db.run('REPLACE INTO Leaderboard(Name,Count,AvgMsgs) VALUES(?,?,?)', [userId, currentCount + 1, newAvg]);
}

function getMembersOnline() {
  return client.users.filter(user => user.presence.status === 'online').size;
}

function updateLeaderboard() {
  // Go through each user in the leaderboard that hasn't had an update in the stats
  db.each('SELECT * from TempLeaderboard where Date NOT BETWEEN ' +
    'datetime(\'now\',\'-1 day\') AND datetime(\'now\')', (err, row) => {
    if (row !== undefined) {
      // Grab current daily average
      db.all('SELECT AvgMsgs,Count from Leaderboard where Name=?', row.Name, (leaderErr, leaderRow) => {
        if (leaderRow !== undefined && leaderRow.length > 0) {
          console.log('updating user ' + row.Name);
          console.log(leaderRow);
          updateUserAverage(row.Name, leaderRow[0].AvgMsgs, leaderRow[0].Count, row.Count);
        } else {
          console.log('Inserting new user ' + row.Name);
          db.run('REPLACE INTO Leaderboard(Name,Count,AvgMsgs) VALUES(?,?,?)', [row.Name, 1, row.Count]);
        }

        // Zero out member's count
        db.run('REPLACE INTO TempLeaderboard(Name,Date,Count) VALUES(?,datetime(\'now\'),?)', [row.Name, 0]);
      });
    }
  });
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
    setInterval(updateLeaderboard, 10000); // Every 10 seconds, check if it's time to update the daily leaderboard
  },
};
