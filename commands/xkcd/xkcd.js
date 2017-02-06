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
          const hrefs = xkcdBody('.result__a').each((i, link) => {
            let href = link.attribs.href;
            if ((href.includes('https://xkcd.com/') || href.includes('https://www.xkcd.com/')) && xkcdLink === false) {
              xkcdLink = href;
            }
          });
        } catch (e) {
          message.channel.sendMessage('There was a problem with DuckDuckGo query.');
        }
        // we are done with finding a link
        if (!xkcdLink) {
          // link is either empty (this should NOT happen) or we don't have a link
          message.channel.sendMessage(`I'm sorry ${message.author}, i couldn't find a xkcd.`);
        } else {
          request(xkcdLink, (error, response, body) => {
            if (!error && response.statusCode === 200) {
              // we have successfully got a response
              const htmlBody = cheerio.load(body);

              if (htmlBody('#comic').children().get(0).tagName === 'img') {
                // some xkcd comics have comic in a <a> tag because of hd image
                // TODO (samox) : Add support for large comics
                const xkcdImg = htmlBody('#comic').children().first();
                message.channel.sendMessage('```diff\n' +
                  `Title: ${htmlBody('#ctitle').text()}\n` +
                  `Alt Text: ${xkcdImg.attr('title')}\n` +
                  '```\n' +
                  `https:${xkcdImg.attr('src')}`);

                if (config.limitMessages) {
                  // we don't want users spamming it
                  lastMessageTime = Math.floor(Date.now() / 1000);
                }
              } else {
                message.channel.sendMessage(`I'm sorry ${message.author}, i couldn't find a xkcd.`);
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
