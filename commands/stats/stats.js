let db;
let client;
const sqlite3 = require('sqlite3');


module.exports = {
  usage: [
    'Get server statistics',
    'stats <channel> - list statistics for specific channel',
  ],
  run: (bot, message, cmdArgs) => {
    console.log("Hello world");
    const numChannels = bot.getTextChannelCount();
    let channelCount = 0;
    var msgBody='```Messages per hour\n-----------\n';

    client.channels.forEach(function add(item) {
      if (item.type === 'text') {
        var sum = 0;
        console.log("Selecting for ", item.name );
        db.all('SELECT AVG_MSGS_PER_HOUR FROM DailyChannelStats WHERE NAME=? order by DATE DESC LIMIT 1',item.name, function(err, rows) {
          console.log(rows);
          channelCount += 1;
          msgBody += item.name + ':' + rows[0].AVG_MSGS_PER_HOUR + '\n';

          if( channelCount === numChannels ) {
            message.channel.sendMessage(msgBody + '```');
          }
          });
      }

    });

    console.log("Sending msg");
    return false;
  },
  init: (bot) => {
    db = new sqlite3.Database('statistics.db');
    client = bot.client;
  },
};
