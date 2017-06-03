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
    'help <topic> - displays known resources about <topic>',
    'help - list known topics',
  ],

  run: (bot, message, cmdArgs) => {
    if (cmdArgs) {
      const response = knownTopics[cmdArgs.toLowerCase()];
      message.channel.send(response ||
        'I don\'t know anything about that. If you have a suggestion, let us know!');
    } else {
      let r = 'Awesome is my name, don\'t wear it out! Please give a me topic for more info.';
      r += '\n\nTopics I know something about:';
      r += '\n```';
      r += Object.keys(knownTopics).map(t => `\n  - ${t}`).join('');
      r += '\n```';
      message.channel.send(r);
    }
  },

  init: () => {
    console.log('Loading help topics...');
    getFileList(path.join(__dirname, 'topics')).forEach((fn) => {
      knownTopics[path.basename(fn, '.txt')] = loadHelpText(path.join(__dirname, 'topics', fn));
    });
  },
};

