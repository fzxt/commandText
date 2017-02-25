const sqlite3 = require('sqlite3');
const discord = require('discord.js');
const toArray = require('stream-to-array');
const util = require('util');

let plotly;
let db;
let client;
let config;

function sendGraph(channel, graphData) {
  const figure = { data: [graphData] };
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

function getStats(channelName, message, backUnit) {
  db.all('SELECT AVG(MsgsPerHour), MIN(MsgsPerHour), MAX(MsgsPerHour) FROM ChannelStats WHERE NAME = ? and Date ' +
    'BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\');', channelName,
  (err, rows) => {
    const embed = new discord.RichEmbed();
    embed.setTitle('Statistics For Channel ' + channelName)
      .setColor('#ff7260')
      .setAuthor(message.guild.name, message.guild.iconURL);

    // The module isn't returning an empty array like it should if you enter a Name not in the list
    if (rows.length ===1 && rows[0]['AVG(MsgsPerHour)'] !== null) {
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

  db.each('SELECT Date, MsgsPerHour FROM ChannelStats WHERE NAME = ? AND Date ' +
    'BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\');', channelName,
    (err, row) => {
      if (row !== undefined) {
        channelGraph.x.push(row.Date);
        channelGraph.y.push(row.MsgsPerHour);
      }
    }, (err) => {
      sendGraph(message.channel, channelGraph);
    });
}

function sendChannelRanks(message, channelData) {
  const embed = new discord.RichEmbed();
  embed.setColor('#ff7260')
    .setAuthor(message.guild.name, message.guild.iconURL);

  let fieldData = '';

  channelData.forEach((channel) => {
    fieldData += channel[0] + ' (Avg ' + channel[1] + '/hr)\n';
  });

  embed.addField('Channel Ranking', fieldData);
  message.channel.sendEmbed(embed);
}

function getChannelRanks(numChannels, message, backUnit, limit) {
  const channelData = {};
  let channelCount = 0;

  client.channels.forEach((item) => {
    if (item.type === 'text') {
      db.all('SELECT AVG(MsgsPerHour) FROM ChannelStats WHERE NAME = ? and Date ' +
        'BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\');', item.name,
        (err, rows) => {
          channelData[item.name] = 0;
          if ( rows !== undefined && rows.length === 1) {
            if (rows[0]['AVG(MsgsPerHour)'] != null) {
              channelData[item.name] = rows[0]['AVG(MsgsPerHour)'].toFixed(2);
            }
          }
          channelCount += 1;

          if (channelCount === numChannels) {
            let list = [];
            Object.keys(channelData).forEach((channel) => {
              list.push([channel, channelData[channel]]);
            });

            // Filter out the channels in the filter list
            list = list.filter(channel => config.channelFilter.indexOf(channel[0]) === -1);

            list.sort((a, b) => b[1] - a[1]);

            if (limit === 0) {
              // Do in chunks of 25
              const chunk = 25;
              let i;
              let j;
              for (i = 0, j = list.length; i < j; i += chunk) {
                const temparray = list.slice(i, i + chunk);
                sendChannelRanks(message, temparray);
              }
            } else {
              list = list.slice(0, limit);
              sendChannelRanks(message, list);
            }
          }
        });
    }
  });
}

function getUserStats(message, backUnit) {
  db.all('SELECT AVG(MembersOnline), MIN(MembersOnline), MAX(MembersOnline) from Members where Date ' +
    'BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\');',
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

  db.each('SELECT Date, MembersOnline from Members where Date ' +
    'BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\');',
    (err, row) => {
      if (row !== undefined) {
        usersGraph.x.push(row.Date);
        usersGraph.y.push(row.MembersOnline);
      }
    }, (err) => {
      sendGraph(message.channel, usersGraph);
    });
}

function getLeaderboard(message) {
  const embed = new discord.RichEmbed();
  embed.setColor('#ff7260');
  db.all('SELECT Name, AvgMsgs from Leaderboard WHERE AvgMsgs!=0 order by AvgMsgs desc limit 20', (err, rows) => {
    if (rows !== undefined && rows.length > 0) {
      let msgField = '';
      let count = 1;
      rows.forEach((row) => {
        client.fetchUser(row.Name).then((username) => {
          msgField += count + '. ' + username + ' (' + row.AvgMsgs + ')\n';

          if (count === rows.length) {
            embed.addField('Leaderboard', msgField);
            message.channel.sendEmbed(embed);
          }
          count += 1;
        });
      });
    } else {
      embed.addField('Leaderboard', 'Uninitialized. Give me some time!');
      message.channel.sendEmbed(embed);
    }
  });
}

module.exports = {
  usage: [
    'Get server statistics',
    'stats <channel> <hourly/daily/weekly/monthly>- list statistics for specific channel.' +
    ' Parameter is optional. Defaults to daily.',
    'stats rank <hourly/daily/weekly/monthly> <all> - ranking of all channels by activity.' +
    ' Two parameters are optional. Defaults to daily.',
    'stats users <hourly/daily/weekly/monthly> - list stats on total users. Parameter is optional. Defaults to daily.',
    'stats leaderboard - list most active users',
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
    }

    if (cmdArgs.length > 0) {
      if (baseCmd === 'users') {
        getUserStats(message, backUnit);
      } else if (baseCmd === 'rank') {
        let limit = 5;

        if (splitArgs.indexOf('all') >= 0) {
          limit = 0;
        }

        getChannelRanks(bot.getTextChannelCount(), message, backUnit, limit);
      } else if (baseCmd === 'leaderboard') {
        getLeaderboard(message);
      } else {
        getStats(cmdArgs.split(' ')[0], message, backUnit);
      }
    } else {
      getChannelRanks(bot.getTextChannelCount(), message, backUnit, 0);
    }
    return false;
  },
  init: (bot) => {
    config = bot.settings.stats;
    db = new sqlite3.Database('statistics.db');
    db.serialize();
    client = bot.client;

    // eslint-disable-next-line global-require
    plotly = require('plotly')(bot.settings.tokens.plotly_username, bot.settings.tokens.plotly_token);
  },
};
