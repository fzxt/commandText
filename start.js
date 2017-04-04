const Bot = require('./StabbyStats.js');
const Tokens = require('./tokens.json');

function start() {
  // check for the discord token
  let jsonToken = false;
  if (Tokens) {
    jsonToken = Tokens.discord;
  }
  const token = jsonToken || process.env.DISCORD_TOKEN;
  if (!token) {
    throw Error('Discord token not set');
  }

  (new Bot(token).init());
}

start();

