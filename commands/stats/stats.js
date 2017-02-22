let db;
let client;
const sqlite3 = require('sqlite3');
const discord = require('discord.js');

function getStats(channelName, message) {
  db.all('SELECT AVG(MsgsPerHour), MIN(MsgsPerHour), MAX(MsgsPerHour) FROM ChannelStats WHERE NAME = ? and Date BETWEEN datetime(\'now\',\'-1 day\') AND datetime(\'now\');', channelName,
  (err, rows) => {
      const embed = new discord.RichEmbed();
      embed.setTitle('Statistics For Channel ' + channelName)
        .setColor('#ff7260')
        .setAuthor(message.guild.name, message.guild.iconURL)
        .setDescription(message.guild.owner.user.username);

    if (rows.length == 1) {
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

function getStatsAllChannels(numChannels, message) {
  let channelData = {};
  let channelCount = 0;

  client.channels.forEach((item) => {
    if (item.type === 'text') {
      const embed = new discord.RichEmbed();
      embed.setTitle('Statistics for ' + item.name)
        .setColor('#ff7260')
        .setAuthor(message.guild.name, message.guild.iconURL);
      db.all('SELECT AVG(MsgsPerHour), MIN(MsgsPerHour), MAX(MsgsPerHour) FROM ChannelStats WHERE NAME = ? and Date BETWEEN datetime(\'now\',\'-1 day\') AND datetime(\'now\');', item.name,
        (err, rows) => {
          channelData[item.name] = { min: 'N/A', max: 'N/A', avg: 'N/A' };
          if (rows.length == 1) {
              if( rows[0]['AVG(MsgsPerHour)'] != null ) {
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
          message.channel.sendEmbed(embed);
          channelCount += 1;

          // if (channelCount === numChannels) {
          //   console.log('sending embed');
          //   //message.channel.sendEmbed(embed);
          // }
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
          .addField('Members Online', message.guild.members.filter((user) => user.presence.status === 'online').size)
          .addField('Avg Members Online', parseInt(rows[0]['AVG(MembersOnline)']))
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
