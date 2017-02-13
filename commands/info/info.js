const request = require('request');
const exec = require('child_process').exec;
const discord = require('discord.js');

const githubAPI = 'https://api.github.com/repos/$repo/commits';
const githubRepo = 'https://github.com/$repo';
const commitTemplate = '$commit $message';
let config;
let uptime;
let lastCommit = {};
let currentCommit = {};
let embed;
const githubHeaders = {
  'User-Agent': 'TheAwesomeBot',
  'Accept': 'application/vnd.github.v3+json', // eslint-disable-line quote-props
};

function infoInit(bot) {
  config = bot.settings.info;
  uptime = bot.commands.uptime;
  // get current checked out commit from git
  exec('git show --oneline -s', (err, stdout) => {
    const gitOutput = stdout.replace('\n\n', '').replace('\n', '');
    currentCommit.shortSHA = gitOutput.split(' ')[0];
    currentCommit.message = gitOutput;
    request({
      url: githubAPI.replace('$repo', config.repo) + '/' +currentCommit.shortSHA,
      headers: githubHeaders,
    }, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        lastCommit.link = 'https://github.com/404';
        return;
      }
      lastCommit.link = JSON.parse(body).html_url;
    });
  });
  // get latest commit in git repo
  request({
    url: githubAPI.replace('$repo', config.repo),
    headers: githubHeaders,
  }, (err, response, body) => {
    if (err || response.statusCode !== 200) {
      lastCommit.link = 'https://github.com/404';
      lastCommit.message = 'Couldn\'t retrieve commit data.';
      return;
    }
    const commitData = JSON.parse(body);
    // TODO (sam): Instead of depending on nullness of the variable,
    // act according to github api docs
    if (commitData[0] == null) {
      lastCommit.message = 'Couldn\'t retrieve commit data.';
      return;
    }
    const commitMessage = commitData[0].commit.message.replace('\n\n', ' ')
      .replace('\n', ' ');
    lastCommit.message = commitTemplate.replace('$commit', commitData[0].sha.slice(0, 7))
      .replace('$message', commitMessage);
    lastCommit.link = commitData[0].html_url;
  });
}

module.exports = {
  init: infoInit,
  run: (bot, message, cmdArgs) => {
    if (cmdArgs) return true;
    if (embed != null) {
      message.channel.sendEmbed(embed);
      return;
    }
    const description = 'Message cmd for available commands.'
    let url = bot.client.user.avatarURL;
    let something = description.replace('cmd', bot.settings.bot_cmd);
    let up = uptime.getUptime();
    embed = new discord.RichEmbed();
    embed.setColor('#4286f4')
      .setAuthor('TheAwesomeBot', bot.client.user.avatarURL, githubRepo.replace('$repo', config.repo))
      .setFooter(description.replace('cmd', bot.settings.bot_cmd))
      .addField('Uptime', uptime.getUptime())
      .addField('Latest Commit', lastCommit)
      .setDescription('An open source bot made with :heart:');
    // let the users know if bot is working on a rolled back commit
    if (currentCommit !== lastCommit) embed.addField('Current Commit', currentCommit);
    message.channel.sendEmbed(embed);
  }
};