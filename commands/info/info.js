const request = require('request');
const exec = require('child_process').exec;
const discord = require('discord.js');

const time = require('../../lib/utils.js').time;

const githubCommits = 'https://api.github.com/repos/$repo/commits';
const githubContributors = 'https://api.github.com/repos/$repo/contributors';
const githubRepo = 'https://github.com/$repo';
const commitTemplate = '$username - $message';
const markdownLink = '[$text]($link)';
const description = 'Message cmd for available commands.';
let config;
const lastCommit = {};
const currentCommit = {};
let contributorsMessage = '';
const githubHeaders = {
  'User-Agent': 'TheAwesomeBot',
  'Accept': 'application/vnd.github.v3+json', // eslint-disable-line quote-props
};

function getLastCommit() {
  request({
    url: githubCommits.replace('$repo', config.repo),
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
    lastCommit.link = commitData[0].html_url;
    lastCommit.username = commitData[0].author ? commitData[0].author.login : 'unkown';
    lastCommit.message = commitTemplate.replace('$username', lastCommit.username)
      .replace('$message', commitMessage);
  });
}

function getCurrentCommit() {
  exec('git show --oneline -s', (err, stdout) => {
    const gitOutput = stdout.replace('\n\n', '').replace('\n', '');
    currentCommit.shortSHA = gitOutput.split(' ')[0];

    request({
      url: githubCommits.replace('$repo', config.repo) + '/' + currentCommit.shortSHA,
      headers: githubHeaders,
    }, (error, response, body) => {
      if (error || response.statusCode !== 200) {
        currentCommit.link = 'https://github.com/404';
        return;
      }
      currentCommit.link = JSON.parse(body).html_url;
      currentCommit.username = JSON.parse(body).author ? JSON.parse(body).author.login : 'unkown';
      currentCommit.message = commitTemplate.replace('$username', currentCommit.username)
        .replace('$message', gitOutput.split(' ').slice(1).join(' '));
    });
  });
}

function getContributors() {
  request({
    url: githubContributors.replace('$repo', config.repo),
    headers: githubHeaders,
  }, (error, response, body) => {
    let jsonData = JSON.parse(body);
    if (Array.isArray(jsonData) && jsonData.length >= 10) {
      jsonData = jsonData.slice(0, 10);
      contributorsMessage = jsonData.slice(0, 10).reduce((acc, cv) =>
        acc + markdownLink.replace('$text', cv.login).replace('$link', cv.html_url) + '\n'
      , '');
    } else {
      contributorsMessage = 'There was an error trying to get the contributors list :(';
    }
  });
}

function infoInit(bot) {
  config = bot.settings.info;
  // get current checked out commit from git
  getCurrentCommit();
  // get latest commit in git repo
  getLastCommit();
  getContributors();
}

function infoRun(bot, message, cmdArgs) {
  if (cmdArgs) {
    if (cmdArgs === 'contributors') {
      const contributorsEmbed = new discord.RichEmbed();
      contributorsEmbed.setColor('#4286f4')
        .setTitle('Top 10 contributors of AwesomeBot:')
        .setDescription(contributorsMessage);
      message.channel.sendEmbed(contributorsEmbed);
    }
  } else {
    const embed = new discord.RichEmbed();
    embed.setColor('#4286f4')
      .setAuthor('TheAwesomeBot', bot.client.user.avatarURL, githubRepo.replace('$repo', config.repo))
      .setFooter(description.replace('cmd', bot.settings.bot_cmd))
      .addField('Uptime', time.timeElapsed(bot.bootTime, new Date()))
      .addField('Latest Commit', markdownLink.replace('$text', lastCommit.message).replace('$link', lastCommit.link))
      .setDescription('An open source bot made with :heart:');
    // let the users know if bot is working on a rolled back commit
    if (currentCommit !== lastCommit) {
      embed.addField('Current Commit', markdownLink.replace('$text', currentCommit.message)
        .replace('$link', currentCommit.link));
    }
    message.channel.sendEmbed(embed);
  }
}

module.exports = {
  usage: [
    'info - displays information about bot',
    'info contributors - displays contributors',
  ],
  init: infoInit,
  run: infoRun,
};
