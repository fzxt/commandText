let db;
let client;
const sqlite3 = require('sqlite3');
const discord = require('discord.js');

function getStats(channelName, message, backUnit) {
  db.all('SELECT AVG(MsgsPerHour), MIN(MsgsPerHour), MAX(MsgsPerHour) FROM ChannelStats WHERE NAME = ? and Date ' +
    'BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\');', channelName,
  (err, rows) => {
    const embed = new discord.RichEmbed();
    embed.setTitle('Statistics For Channel ' + channelName)
      .setColor('#ff7260')
      .setAuthor(message.guild.name, message.guild.iconURL)
      .setDescription(message.guild.owner.user.username);

    if (rows.length === 1) {
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
}

function getChannelRanks(numChannels, message, backUnit, limit) {
  const channelData = {};
  let channelCount = 0;

  const embed = new discord.RichEmbed();
  embed.setColor('#ff7260')
    .setAuthor(message.guild.name, message.guild.iconURL);

  client.channels.forEach((item) => {
    if (item.type === 'text') {
      db.all('SELECT AVG(MsgsPerHour) FROM ChannelStats WHERE NAME = ? and Date ' +
        'BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\');', item.name,
        (err, rows) => {
          channelData[item.name] = 0;
          if (rows.length === 1) {
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

            list.sort((a, b) => b[1] - a[1]);

            if (limit > 0) {
              list = list.slice(0, limit);
            }

            let fieldData = '';

            list.forEach((channel) => {
              fieldData += channel[0] + ' (Avg ' + channel[1] + ')\n';
            });

            embed.addField('Channel Ranking', fieldData);
            message.channel.sendEmbed(embed);
          }
        });
    }
  });
}

function getUserStats(message, backUnit) {
  db.all('SELECT AVG(MembersOnline), MIN(MembersOnline), MAX(MembersOnline) from Members where Date' +
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
}

module.exports = {
  usage: [
    'Get server statistics',
    'stats <channel> <hourly/daily/weekly/monthly>- list statistics for specific channel. Parameter is optional. Defaults to daily.',
    'stats rank <hourly/daily/weekly/monthly> <all> - ranking of all channels by activity. Two parameters are optional. Defaults to daily.',
    'stats users <hourly/daily/weekly/monthly> - list stats on total users. Parameter is optional. Defaults to daily.',
  ],
  run: (bot, message, cmdArgs) => {
    if (message.member.user.username !== 'superstabby') {
      return true;
    }
    const splitArgs = cmdArgs.split(' ');
    const baseCmd = splitArgs[0];
    var backUnit = '-1 day'

    if (splitArgs.indexOf('hourly') >= 0) {
      backUnit = '-1 hour';
    } else if (splitArgs.indexOf('weekly') >= 0) {
      backUnit = '-7 days';
    } else if (splitArgs.indexOf('monthly') >= 0) {
      backUnit = '-1 month';
    }

    if (splitArgs.length > 1) {
      flag = splitArgs[1];
    }

    if (cmdArgs.length > 0) {
      if (baseCmd === 'users') {
        getUserStats(message, backUnit);
      } else if (baseCmd === 'rank') {
        var backUnit = '-1 day';
        var limit = 5;

        if (splitArgs.indexOf('all') >= 0) {
          limit = 0;
        }

        getChannelRanks(bot.getTextChannelCount(), message, backUnit, limit);

      } else {
        getStats(cmdArgs.split(' ')[0], message, backUnit);
      }
    } else {
      getChannelRanks(bot.getTextChannelCount(), message, backUnit, 0);
    }
    return false;
  },
  init: (bot) => {
    db = new sqlite3.Database('statistics.db');
    client = bot.client;
  },
};
