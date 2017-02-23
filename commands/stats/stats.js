let db;
let client;
const sqlite3 = require('sqlite3');
const discord = require('discord.js');

function getStats(channelName, message) {
  db.all('SELECT AVG(MsgsPerHour), MIN(MsgsPerHour), MAX(MsgsPerHour) FROM ChannelStats WHERE NAME = ? and Date ' +
    'BETWEEN datetime(\'now\',\'-1 day\') AND datetime(\'now\');', channelName,
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

function getChannelRanks(numChannels, message) {
  const channelData = {};
  let channelCount = 0;

  const embed = new discord.RichEmbed();
  embed.setColor('#ff7260')
    .setAuthor(message.guild.name, message.guild.iconURL);

  client.channels.forEach((item) => {
    if (item.type === 'text') {
      db.all('SELECT AVG(MsgsPerHour) FROM ChannelStats WHERE NAME = ? and Date ' +
        'BETWEEN datetime(\'now\',\'-1 day\') AND datetime(\'now\');', item.name,
        (err, rows) => {
          channelData[item.name] = 0;
          if (rows.length === 1) {
            if (rows[0]['AVG(MsgsPerHour)'] != null) {
              channelData[item.name] = rows[0]['AVG(MsgsPerHour)'].toFixed(2);
            }
          }
          channelCount += 1;

          if (channelCount === numChannels) {
            const list = [];
            Object.keys(channelData).forEach((channel) => {
              list.push([channel, channelData[channel]]);
            });

            list.sort((a, b) => b[1] - a[1]);

            let fieldData = '';

            list.forEach((channel) => {
              fieldData += channel[0] + '\n';
            });

            embed.addField('Channel Ranking', fieldData);
            message.channel.sendEmbed(embed);
          }
        });
    }
  });
}

function getStatsAllChannels(numChannels, message, backUnit) {
  const channelData = {};
  let channelCount = 0;

  client.channels.forEach((item) => {
    if (item.type === 'text') {
      const embed = new discord.RichEmbed();
      embed.setTitle('Statistics for ' + item.name)
        .setColor('#ff7260')
        .setAuthor(message.guild.name, message.guild.iconURL);
      db.all('SELECT AVG(MsgsPerHour), MIN(MsgsPerHour), MAX(MsgsPerHour) FROM ChannelStats ' +
        'WHERE NAME = ? and Date BETWEEN datetime(\'now\',\'' + backUnit + '\') AND datetime(\'now\');', item.name,
        (err, rows) => {
          channelData[item.name] = { min: 'N/A', max: 'N/A', avg: 'N/A', embed: null };
          if (rows.length === 1) {
            if (rows[0]['AVG(MsgsPerHour)'] != null) {
              channelData[item.name].avg = rows[0]['AVG(MsgsPerHour)'].toFixed(2);
            }

            if (rows[0]['MIN(MsgsPerHour)'] != null) {
              channelData[item.name].min = rows[0]['MIN(MsgsPerHour)'];
            }

            if (rows[0]['MAX(MsgsPerHour)'] != null) {
              channelData[item.name].max = rows[0]['MAX(MsgsPerHour)'];
            }
          }

          embed.addField('Average Messages Per Hour', channelData[item.name].avg)
            .addField('Minimum Messages Per Hour', channelData[item.name].min)
            .addField('Maximum Messages Per Hour', channelData[item.name].max);

          channelData[item.name].embed = embed;
          channelCount += 1;

          if (channelCount === numChannels) {
            const list = [];
            Object.keys(channelData).forEach((channel) => {
              list.push(channelData[channel]);
            });

            list.sort((a, b) => {
              if (a.avg === 'N/A') {
                return 1;
              }

              if (b.avg === 'N/A') {
                return -1;
              }

              return b.avg - a.avg;
            });

            list.forEach((channel) => {
              message.channel.sendEmbed(channel.embed);
            });
          }
        });
    }
  });
}

function getUserStats(message) {
  db.all('SELECT AVG(MembersOnline), MIN(MembersOnline), MAX(MembersOnline) from Members',
    (err, rows) => {
      if (rows.length > 0) {
        const embed = new discord.RichEmbed();
        embed.setTitle('Statistics')
          .setColor('#ff7260')
          .setAuthor(message.guild.name, message.guild.iconURL)
          .setDescription(message.guild.owner.user.username)
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
    'stats <channel> - list statistics for specific channel',
    'stats rank - ranking of all channels by activity',
    'stats hourly - list most recent hourly stats',
    'stats daily - list stats for the past 24 hours',
    'stats weekly - list stats for the past week',
    'stats monthly - list stats for the past month',
    'stats users - list stats on total users',
  ],
  run: (bot, message, cmdArgs) => {
    if (message.member.user.username !== 'superstabby') {
      return true;
    }
    if (cmdArgs.length > 0) {
      if (cmdArgs === 'users') {
        getUserStats(message);
      } else if (cmdArgs === 'rank') {
        getChannelRanks(bot.getTextChannelCount(), message);
      } else if (cmdArgs === 'hourly') {
        getStatsAllChannels(bot.getTextChannelCount(), message, '-1 hour');
      } else if (cmdArgs === 'weekly') {
        getStatsAllChannels(bot.getTextChannelCount(), message, '-7 day');
      } else if (cmdArgs === 'monthly') {
        getStatsAllChannels(bot.getTextChannelCount(), message, '-1 month');
      } else if (cmdArgs === 'daily') {
        getStatsAllChannels(bot.getTextChannelCount(), message, '-1 day');
      } else {
        getStats(cmdArgs.split(' ')[0], message);
      }
    } else {
      getStatsAllChannels(bot.getTextChannelCount(), message, '-1 day');
    }
    return false;
  },
  init: (bot) => {
    db = new sqlite3.Database('statistics.db');
    client = bot.client;
  },
};
