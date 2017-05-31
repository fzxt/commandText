const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const ReplitClient = require('replit-client');
const gentoken = require('./gentoken');

global.XMLHttpRequest = XMLHttpRequest;

// list of langs:
// https://github.com/replit/ReplitClient.js#replitclienthostname-port-language-token
const availableLanguages = [
  'c',
  'cpp',
  'cpp11',
  'csharp',
  'fsharp',
  'go',
  'java',
  'lua',
  'nodejs',
  'php',
  'python',
  'python3',
  'ruby',
  'rust',
  'swift',
];

// map usual lang names to replit names
const langAliases = {
  'c#': 'csharp',
  'c++': 'cpp',
  'c++11': 'cpp11',
  'f#': 'fsharp',
  js: 'nodejs',
  javascript: 'nodejs',
  py2: 'python',
  py: 'python3',
  py3: 'python3',
  rb: 'ruby',
};

const validateLang = (lang) => {
  if (typeof lang !== 'string') {
    return false;
  }

  const l = langAliases[lang.toLowerCase()] || lang.toLowerCase();

  if (availableLanguages.includes(l)) {
    return l;
  }
  return false;
};

module.exports = {
  usage: [
    'eval <lang> <code> - run code in repl.it',
    'eval - show available languages',
  ],

  run: (bot, message, cmdArgs) => {
    if (!cmdArgs) {
      const langList = availableLanguages.reduce((prev, x) => {
        let langEntry = `${prev}${prev ? '\n' : ''}- ${x}`;
        const aliases = Object.keys(langAliases)
          .filter(alias => langAliases[alias] === x)
          .join(', ');
        if (aliases) {
          langEntry += ` (${aliases})`;
        }
        return langEntry;
      }, '');
      message.reply(`available languages:\n\`\`\`\n${langList}\n\`\`\`\n`);
      return;
    }

    // parsing the messages against regex to obtain the lang and code
    let rxLangs = Object.keys(langAliases)
                        .map((v) => {
                          if (v === 'c++') {
                            return 'c\\+\\+';
                          } else if (v === 'c++11') {
                            return 'c\\+\\+11';
                          }
                          return v;
                        });
    rxLangs.push(...availableLanguages);
    rxLangs = rxLangs.sort((a, b) => b.length - a.length).join('|');
    const rx = new RegExp('^(`{0,3})(' + rxLangs + ')\\s*((.|\\s)+)(\\1)$', 'gi');
    const argsArr = rx.exec(cmdArgs);
    let lang = argsArr[2].toLowerCase();
    const code = (new RegExp('^(`{0,3})((' + rxLangs + '|.{0})\\s)?\\s*((.|\\s)+)(\\1)$', 'gi')).exec(argsArr[3])[4];
    lang = validateLang(lang);
    if (!lang) {
      message.reply('Sorry, I don\'t know that language!');
      return;
    }

    const apiToken = bot.settings.tokens.replit || process.env.REPLIT_TOKEN;
    const repl = new ReplitClient(
      'api.repl.it',
      80,
      lang, gentoken(apiToken));

    message.channel.sendMessage('⏲ evaluating...')
      .then((evalMsg) => {
        let newContent = '';
        repl.evaluateOnce(
          code, {
            stdout: (output) => {
              newContent += `Code output:\n\`\`\`\n${output}\n\`\`\`\n`;
            },
          }).then(
            (result) => {
              if (result.error) {
                newContent += `Error:\n\`\`\`${result.error}\`\`\`\n`;
              } else {
                newContent += `Result:\n\`\`\`${result.data}\`\`\`\n`;
              }
              evalMsg.edit(newContent);
            },
            (error) => {
              newContent += `Error connecting to repl.it!\`\`\`${error}\`\`\`\n`;
              evalMsg.edit(newContent);
              console.error(error);
            });
      })
      .catch(console.error);
  },
};

