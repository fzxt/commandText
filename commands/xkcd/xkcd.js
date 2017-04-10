const request = require('request');
const cheerio = require('cheerio');

let timeLimit = 60;
let config;
let lastMessageTime;

module.exports = {
  usage: 'xkcd <keywords> - finds a xkcd comic with relevant keywords',
  run: (bot, message, cmdArgs) => {
    let xkcdLink = false;

    if ((Math.floor(Date.now() / 1000) - lastMessageTime) >= timeLimit) {
      if (!cmdArgs) {
        return true;
      }

      const options = {
        url: `https://duckduckgo.com/html/?q=${cmdArgs}%20xkcd`,
        headers: {
          'accept-language': 'en-US,en;q=0.8',
          'upgrade-insecure-requests': 1,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
        },
      };
      request(options, (err, res, bod) => {
        const xkcdBody = cheerio.load(bod);
        try {
          xkcdBody('.result__a').each((i, link) => {
            const href = link.attribs.href;
            if (href.search(/^https?:\/\/(www\.)?xkcd\.com\/\d+/) !== -1 && xkcdLink === false) {
              xkcdLink = href + 'info.0.json';
            }
          });
        } catch (e) {
          message.channel.sendMessage('There was a problem with DuckDuckGo query.');
        }
        // we are done with finding a link
        if (!xkcdLink) {
          // link is either empty (this should NOT happen) or we don't have a link
          message.channel.sendMessage(`I'm sorry ${message.author}, I couldn't find a xkcd.`);
        } else {
          request(xkcdLink, (error, response, body) => {
            if (!error && response.statusCode === 200) {
              const bodyObj = JSON.parse(body);

              if (bodyObj) {
                message.channel.sendMessage('```diff\n' +
                `Title: ${bodyObj.safe_title}\n` +
                `Alt Text: ${bodyObj.alt}\n` +
                '```\n' +
                `${bodyObj.img}`);
              } else {
                message.channel.sendMessage(`I'm sorry, ${message.author}, there was a problem retrieving your XKCD.`);
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
    config = bot.settings.xkcd;
    timeLimit = config.timeLimit || timeLimit;
    lastMessageTime = Math.floor(Date.now() / 1000) - timeLimit;
  },
};
