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
    'help - links to the new resource list at https://github.com/progdisc/resources',
  ],

  run: (bot, message) => {
    let r = 'This command is deprecated.\n';
    r += 'See https://github.com/progdisc/resources for our new and improved resource list.';
    message.channel.send(r);
  },

  init: () => {
    console.log('Loading help topics...');
    getFileList(path.join(__dirname, 'topics')).forEach((fn) => {
      knownTopics[path.basename(fn, '.txt')] = loadHelpText(path.join(__dirname, 'topics', fn));
    });
  },
};

