const fs = require('fs');
const path = require('path');

const getFileList = (dirName) => {
  const fileList = fs.readdirSync(dirName);
  return fileList || [];
};

const loadReferences = (filename) => {
  const content = fs.readFileSync(filename, 'utf8');
  return content || '';
};

function isEmptyOrSpaces(str) {
  return str === null || str.match(/^ *$/) !== null;
}

const references = {};

module.exports = {
  usage: [
    'quickref <topic> - displays quick reference for <topic>',
    'help - list known references',
  ],
  run: (bot, message, cmdArgs) => {
    if (cmdArgs) {
      const response = references[cmdArgs.toLowerCase()];

      if (response) {
        message.channel.sendMessage(
          `${response}`);
      } else {

        message.channel.sendMessage('I don\'t have any references for that. If you have a suggestion, let us know!');
      }
    } else {
      // let r = 'Awesome is my name, don\'t wear it out! Please give a me topic for more info.';
      let r = '\nreferences I have ready to go:';
      r += '\n```';
      r += Object.keys(references).map(t => `\n  - ${t}`).join('');
      r += '\n```';
      message.channel.sendMessage(r);
    }
  },
  init: () => {
    console.log('Loading references...');
    getFileList(path.join(__dirname, 'references')).forEach((fn) => {
      references[path.basename(fn, '.txt')] = loadReferences(path.join(__dirname, 'references', fn));
    });
  },
};
