const sqlite3 = require('sqlite3');
const discord = require('discord.js');
const toArray = require('stream-to-array');
const util = require('util');

let plotly;
let db;
let client;
let config;

function sendGraph(channel, graphData, graphTitle, xLabel, yLabel) {
  const figure = {
    data: [graphData],
    layout: {
      title: graphTitle,
      xaxis: {
        title: xLabel,
      },
      yaxis: {
        title: yLabel,
      },
    },
  };
  const imgOpts = {
    format: 'png',
    width: 1000,
    height: 500,
  };

  plotly.getImage(figure, imgOpts, (error, imageStream) => {
    if (error) return console.log(error);

    toArray(imageStream).then((parts) => {
      const buffers = parts.map(part => (util.isBuffer(part) ? part : Buffer.from(part)));
      channel.sendFile(Buffer.concat(buffers));
    });

    // Not sure why lint is making me do this
    return imageStream;
  });
}

function getChannelNameFromId(channelId) {
  let channelName = 'unknown';

  client.channels.forEach((item) => {
    if (item.id === channelId) {
      channelName = item.name;
    }
  });

  return channelName;
}

function getStats(channelName, message, backUnit) {
  let channelID = 'unknown';

  if (channelName === 'overall') {
    channelID = 'overall';
  } else {
    client.channels.forEach((item) => {
      if (item.type === 'text') {
        if (item.name === channelName) {
          channelID = item.id;
        }
      }
    }, this);
  }

  if (channelID === 'unknown') {
    message.channel.sendMessage('I\'ve searched all over, but I cannot find the channel: ' + channelName);
    return;
  }

  let backQuery = 'AND Date BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\') ';

  if (backUnit === 'forever') {
    backQuery = '';
  }

  db.all('SELECT AVG(MsgsPerHour), MIN(MsgsPerHour), MAX(MsgsPerHour) FROM ChannelStats WHERE NAME = ? ' +
    backQuery + ';', channelID,
  (err, rows) => {
    const embed = new discord.RichEmbed();
    embed.setTitle('Statistics For Channel ' + channelName)
      .setColor('#ff7260')
      .setAuthor(message.guild.name, message.guild.iconURL);

    // The module isn't returning an empty array like it should if you enter a Name not in the list
    if (rows.length === 1 && rows[0]['AVG(MsgsPerHour)'] !== null) {
      embed.addField('Average Messages Per Hour', rows[0]['AVG(MsgsPerHour)'].toFixed(2))
      .addField('Minimum Messages Per Hour', rows[0]['MIN(MsgsPerHour)'])
      .addField('Maximum Messages Per Hour', rows[0]['MAX(MsgsPerHour)']);
    } else {
      embed.addField('Average Messages Per Hour', 'N/A')
      .addField('Minimum Messages Per Hour', 'N/A')
      .addField('Maximum Messages Per Hour', 'N/A');
    }

    message.channel.sendEmbed(embed);
  });

  const channelGraph = {
    x: [],
    y: [],
    type: 'scatter',
  };

  db.each('SELECT Date, MsgsPerHour FROM ChannelStats WHERE NAME = ? ' +
    backQuery + ';', channelID,
    (err, row) => {
      if (row !== undefined) {
        channelGraph.x.push(row.Date);
        channelGraph.y.push(row.MsgsPerHour);
      }
    }, (err) => {
      sendGraph(message.channel, channelGraph, 'Stats for channel ' + channelName, 'Time', 'Msgs/Hr');
    });
}

function sendChannelRanks(message, channelData) {
  const embed = new discord.RichEmbed();
  embed.setColor('#ff7260')
    .setAuthor(message.guild.name, message.guild.iconURL);

  let fieldData = '';

  channelData.forEach((channel) => {
    fieldData += channel.Name + ' (Avg ' + parseFloat(channel.Avg).toFixed(2) + '/hr)\n';
  });

  embed.addField('Channel Ranking', fieldData);
  message.channel.sendEmbed(embed);
}

function getChannelRanks(message, backUnit, limit) {
  const channelData = [];

  let limitStr = '';
  if (limit !== 0) {
    limitStr = 'LIMIT ' + limit;
  }

  let backQuery = 'WHERE Date BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\') ';

  if (backUnit === 'forever') {
    backQuery = '';
  }

  db.each('SELECT Name, Avg(MsgsPerHour) AS Avg FROM ChannelStats ' + backQuery +
    'GROUP BY Name ORDER BY Avg(MsgsPerHour) DESC ' + limitStr + ';', (err, row) => {
    if (row !== undefined) {
      if (config.channelFilter.indexOf(row.Name) === -1) {
        const channelName = getChannelNameFromId(row.Name);
        if (channelName !== 'unknown') {
          channelData.push({ Name: getChannelNameFromId(row.Name), Avg: row.Avg });
        } else {
          console.log('Unknown channel ID: ' + row.Name);
        }
      }
    }
  }, (err) => {
    sendChannelRanks(message, channelData);
  });
}

function getUserStats(message, backUnit) {
  let backQuery = 'WHERE Date BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\') ';

  if (backUnit === 'forever') {
    backQuery = '';
  }

  db.all('SELECT AVG(MembersOnline), MIN(MembersOnline), MAX(MembersOnline) from Members ' + backQuery + ';',
    (err, rows) => {
      if (rows.length > 0) {
        const embed = new discord.RichEmbed();
        embed.setTitle('User Statistics')
          .setColor('#ff7260')
          .setAuthor(message.guild.name, message.guild.iconURL)
          .addField('Members', message.guild.members.size, true)
          .addField('Members Online', message.guild.members.filter(user => user.presence.status === 'online').size)
          .addField('Avg Members Online', parseInt(rows[0]['AVG(MembersOnline)'], 10))
          .addField('Min Members Online', rows[0]['MIN(MembersOnline)'])
          .addField('Max Members Online', rows[0]['MAX(MembersOnline)'])
          .addField('Created', message.guild.createdAt.toString(), true);
        message.channel.sendEmbed(embed);
      }
    });

  const usersGraph = {
    x: [],
    y: [],
    type: 'scatter',
  };

  db.each('SELECT Date, MembersOnline from Members ' +
    backQuery + ';',
    (err, row) => {
      if (row !== undefined) {
        usersGraph.x.push(row.Date);
        usersGraph.y.push(row.MembersOnline);
      }
    }, (err) => {
      sendGraph(message.channel, usersGraph, 'Users Online', 'Time', 'Users');
    });
}

function getLeaderboard(message, backUnit) {
  let msgField = '';
  let count = 1;
  let dbQuery = 'SELECT Name, Count(*) AS NumMessages FROM Leaderboard WHERE Date BETWEEN datetime' +
  '(\'now\',\'' + backUnit + '\') AND datetime(\'now\') GROUP BY Name ORDER BY COUNT(*) DESC LIMIT 20;';

  if (backUnit === 'forever') {
    dbQuery = 'SELECT Name, Count(*) AS NumMessages FROM Leaderboard GROUP BY Name ORDER BY COUNT(*) DESC LIMIT 20;';
  }

  db.each(dbQuery, (err, row) => {
    if (row !== undefined) {
      client.fetchUser(row.Name).then((username) => {
        msgField += count + '. ' + username + '(' + row.NumMessages + ')\n';
        count += 1;
      });
    }
  }, (err) => {
    const embed = new discord.RichEmbed();
    embed.addField('Leaderboard', msgField);
    message.channel.sendEmbed(embed);
  });
}

module.exports = {
  usage: [
    'channel <channel name> <hourly/daily/weekly/monthly/forever>- list statistics for specific channel.' +
    ' Parameter is optional. Defaults to daily.',
    'rank <hourly/daily/weekly/monthly/forever> <all> - ranking of all channels by activity.' +
    ' Two parameters are optional. Defaults to daily.',
    'users <hourly/daily/weekly/monthly/forever> - list stats on total users. Parameter is ' +
    'optional. Defaults to daily.',
    'leaderboard <hourly/daily/weekly/monthly/forever>- list most active users',
  ],
  run: (bot, message, cmdArgs) => {
    const splitArgs = cmdArgs.split(' ');
    const baseCmd = splitArgs[0];
    let backUnit = '-1 day';

    if (splitArgs.indexOf('hourly') >= 0) {
      backUnit = '-1 hour';
    } else if (splitArgs.indexOf('weekly') >= 0) {
      backUnit = '-7 days';
    } else if (splitArgs.indexOf('monthly') >= 0) {
      backUnit = '-1 month';
    } else if (splitArgs.indexOf('forever') >= 0) {
      backUnit = 'forever';
    }

    if (cmdArgs.length > 0) {
      if (baseCmd === 'users') {
        getUserStats(message, backUnit);
      } else if (baseCmd === 'rank') {
        let limit = 5;

        if (splitArgs.indexOf('all') >= 0) {
          limit = 0;
        }

        getChannelRanks(message, backUnit, limit);
      } else if (baseCmd === 'leaderboard') {
        getLeaderboard(message, backUnit);
      } else if (baseCmd === 'channel') {
        getStats(cmdArgs.split(' ')[1], message, backUnit);
      }
    }
    return false;
  },
  init: (bot) => {
    config = bot.settings.stats;
    db = new sqlite3.Database('statistics.db', sqlite3.OPEN_READONLY);
    db.configure('busyTimeout', 2000); // 2 second busy timeout
    db.serialize();
    client = bot.client;

    // eslint-disable-next-line global-require
    plotly = require('plotly')(bot.settings.tokens.plotly_username, bot.settings.tokens.plotly_token);
  },
};
