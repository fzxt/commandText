const request = require('request-promise');
const cheerio = require('cheerio');

const ddgHeaders = {
  'accept-language': 'en-US,en;q=0.8',
  'upgrade-insecure-requests': 1,
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36',
};

const ddgUrlTemplate = 'https://duckduckgo.com/html/?q=$q xkcd';

function parseXkcdDataFromXkcdUrl(xkcdUrl) {
  return request(xkcdUrl).then((xkcdBody) => {
    const xkcdData = JSON.parse(xkcdBody);

    if (xkcdData) {
      return '```diff\n' +
        `Title: ${xkcdData.safe_title}\n` +
        `Alt Text: ${xkcdData.alt}\n` +
        '```\n' +
        `${xkcdData.img}`;
    }
    // eslint-disable-next-line no-throw-literal
    throw 'I\'m sorry, there was a problem retrieving a XKCD.';
  });
}

function parseXkcdUrlFromDuckDuckGo(ddgBody) {
  const ddgParsed = cheerio.load(ddgBody);
  let xkcdUrl = false;

  try {
    ddgParsed('.result__a').each((i, link) => {
      const href = link.attribs.href;

      if (href.search(/^https?:\/\/(www\.)?xkcd\.com\/\d+/) !== -1 && xkcdUrl === false) {
        xkcdUrl = href + 'info.0.json';
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-throw-literal
    throw 'There was a problem with DuckDuckGo query.';
  }

  if (!xkcdUrl) {
    // eslint-disable-next-line no-throw-literal
    throw 'I\'m sorry, I couldn\'t find a xkcd.';
  } else {
    return xkcdUrl;
  }
}

function findXkcdFromKeywords(keywords) {
  const ddgUrl = ddgUrlTemplate.replace('$q', encodeURI(keywords));

  return request({
    url: ddgUrl,
    headers: ddgHeaders,
  }).then(parseXkcdUrlFromDuckDuckGo)
    .then(parseXkcdDataFromXkcdUrl);
}

module.exports = {
  usage: 'xkcd <keywords> - finds a xkcd comic with relevant keywords',
  run: (bot, message, cmdArgs) => {
    if (!cmdArgs) {
      return true;
    }

    findXkcdFromKeywords(cmdArgs).then((data) => {
      message.channel.sendMessage(data);
    })
    .catch((err) => {
      message.channel.sendMessage(err);
    });

    return false;
  },
};
