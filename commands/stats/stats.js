let db;
let client;

module.exports = {
  usage: [
    'Get server statistics',
    'stats <channel> - list statistics for specific channel',
  ],
  run: (bot, message, cmdArgs) => {
    console.log("Hello world");

    var msgBody='';
    var msgSums={}

    client.channels.forEach(function add(item) {
      if (item.type === 'text') {
        var sum = 0;
        console.log("Selecting for ", item.name );
        db.all('SELECT MSGS_PER_HOUR FROM ChannelStats WHERE NAME=?',item.name, function(err, rows) {
          rows.forEach(function(item) {
            console.log(item.MSGS_PER_HOUR);
          });
          });
      }

    });

    console.log("Sending msg");
    return false;
  },
  init: (bot) => {
    db = bot.db;
    client = bot.client;
  },
};
