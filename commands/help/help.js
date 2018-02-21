const fs = require('fs');
const path = require('path');

const getFileList = (dirName) => {
  const fileList = fs.readdirSync(dirName);
  return fileList || [];
};

const loadHelpText = (filename) => {
  const content = fs.readFileSync(filename, 'utf8');
  return content || '';
};

// basic help commands
const knownTopics = {};

module.exports = {
  usage: [
      'help - links to the new resource list at https://github.com/progdisc/resources'
  ],

  run: (bot, message, cmdArgs) => {
    // if (cmdArgs) {
    //   const response = knownTopics[cmdArgs.toLowerCase()];
    //   message.channel.sendMessage(response ||
    //     'I don\'t know anything about that. If you have a suggestion, let us know!');
    // } else {
    //   let r = 'Awesome is my name, don\'t wear it out! Please give a me topic for more info.';
    //   r += '\n\nTopics I know something about:';
    //   r += '\n```';
    //   r += Object.keys(knownTopics).map(t => `\n  - ${t}`).join('');
    //   r += '\n```';
      let r = 'This command is deprecated.';
      r += 'See https://github.com/progdisc/resources for our new and improved resource list.';
      message.channel.sendMessage(r);
  },

  init: () => {
    console.log('Loading help topics...');
    getFileList(path.join(__dirname, 'topics')).forEach((fn) => {
      knownTopics[path.basename(fn, '.txt')] = loadHelpText(path.join(__dirname, 'topics', fn));
    });
  },
};

