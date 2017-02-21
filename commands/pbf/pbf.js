const request = require('request');
const cheerio = require('cheerio');

let timeLimit = 60;
let config;
let lastMessageTime;

module.exports = {
  usage: 'pbf <keywords> - finds a pbf comic with relevant keywords',
  run: (bot, message, cmdArgs) => {
    let pbfLink = false;

    if ((Math.floor(Date.now() / 1000) - lastMessageTime) >= timeLimit) {
      if (!cmdArgs) {
        return true;
      }

      const options = {
        url: `https://duckduckgo.com/html/?q=${cmdArgs}%20pbfcomics`,
        headers: {
          'accept-language': 'en-US,en;q=0.8',
          'upgrade-insecure-requests': 1,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
        },
      };
      request(options, (err, res, bod) => {
        const pbfBody = cheerio.load(bod);
        try {
          pbfBody('.result__a').each((i, link) => {
            const href = link.attribs.href;
            if (href.search(/^https?:\/\/(www\.)?pbfcomics\.com\/\d+\//) !== -1 && pbfLink === false) {
              pbfLink = href;
            }
          });
        } catch (e) {
          message.channel.sendMessage('There was a problem with DuckDuckGo query.');
        }
        // we are done with finding a link
        if (!pbfLink) {
          // link is either empty (this should NOT happen) or we don't have a link
          message.channel.sendMessage(`I'm sorry ${message.author}, i couldn't find a PBF Comic.`);
        } else {
          request(pbfLink, (error, response, body) => {
            if (!error && response.statusCode === 200) {
              // we have successfully got a response
              const htmlBody = cheerio.load(body);

              if (htmlBody('#topimg')) {
                const img = htmlBody('#topimg');
                message.channel.sendMessage('```diff\n' +
                  `Title: ${img.attr('alt')}\n` +
                  '```\n' +
                  `http://pbfcomics.com${img.attr('src')}`);

                if (config.limitMessages) {
                  // we don't want users spamming it
                  lastMessageTime = Math.floor(Date.now() / 1000);
                }
              } else {
                message.channel.sendMessage(`I'm sorry ${message.author}, i couldn't find a PBF Comic.`);
              }
            }
          });
        }
      });
    } else {
      // message isn't sent because of time limit
    }
    return false;
  },
  init: (bot) => {
    config = bot.settings.pbf;
    timeLimit = config.timeLimit || timeLimit;
    lastMessageTime = Math.floor(Date.now() / 1000) - timeLimit;
  },
};
