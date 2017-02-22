/* eslint-disable class-methods-use-this */
const path = require('path');
const Discord = require('discord.js');

const Settings = require(path.join(__dirname, 'settings.json')); // eslint-disable-line import/no-dynamic-require
let Tokens;
try {
  // eslint-disable-next-line global-require, import/no-dynamic-require
  Tokens = require(path.join(__dirname, 'tokens.json'));
} catch (e) {
  Tokens = {};
}

class TheAwesomeBot {
  constructor(token, discordOpt) {
    this.token = token;
    this.client = new Discord.Client(discordOpt || { autoReconnect: true });
    this.settings = Settings;
    this.settings.tokens = Tokens; // insert tokens into our settings obj
    this.commands = {};
    this.tasks = {};
    this.usageList = '';

    // store the RE as they're expensive to create
    this.cmd_re = new RegExp(`^${this.settings.bot_cmd}\\s+([^\\s]+)\\s*([^]*)\\s*`, 'i');

    // flags if connected and client is ready
    this.isReady = false;
  }

  getTextChannelCount() {
    // Might be a better way to do this in javascript
    let count = 0;

    this.client.channels.forEach( function(item) {
      if (item.type === 'text') {
        count += 1;
      }
    });

    return count;
  }

  onMessage() {
    return (message) => {
      // don't respond to own messages
      if (this.client.user.username === message.author.username) {
        return;
      }

      // check if message is a command
      const cmdMatch = message.cleanContent.match(this.cmd_re);

      // not a known command
      if (!cmdMatch || Object.keys(this.commands).indexOf(cmdMatch[1]) === -1) {
        if (message.content.match(new RegExp(`^${this.settings.bot_cmd}[\\s]*( .*)?$`, 'i'))) {
          let helpText = 'maybe try these valid commands? *kthnxbye!*\n\n```';
          helpText += this.usageList;
          helpText += '```';
          message.channel.sendMessage(helpText);
        }
        return;
      }

      // process commands
      const cmd = cmdMatch[1];
      const cmdArgs = cmdMatch[2].trim();

      let showUsage;

      try {
        showUsage = this.commands[cmd].run(this, message, cmdArgs);
      } catch (err) {
        message.channel.sendMessage('There was an error running the command:\n' +
          '```\n' + err.toString() + '\n```');
        console.error(err);
        console.error(err.stack);
      }

      if (showUsage === true) {
        let usage = this.commands[cmd].usage;
        if (typeof usage !== 'string') {
          usage = usage.join('\n');
        }
        message.channel.sendMessage('```\n' + usage + '\n```');
      }
    };
  }

  onReady() {
    return (() => {
      console.log('\nConnected to discord server!');
      console.log('Running initializations...');
      Object.keys(this.commands).filter(cmd =>
        typeof this.commands[cmd].init === 'function')
      .forEach(cmd => this.commands[cmd].init(this));
      Object.keys(this.tasks).filter(task =>
        typeof this.tasks[task].init === 'function')
      .forEach(task => this.tasks[task].init(this));
      this.isReady = true;
    });
  }

  serverNewMember() {
    return ((server, user) => this.client.sendMessage(user, this.usageList));
  }

  onDisconnected() {
    return () =>
      console.warn('Bot has been disconnected from server...');
  }

  onError() {
    return ((err) => {
      console.error('error: ', err);
      console.error(err.trace);
    });
  }

  loadTasks(taskList) {
    taskList.forEach((task) => {
      const fullpath = path.join(__dirname, 'tasks', task, `${task}.js`);
      const script = require(fullpath); // eslint-disable-line global-require, import/no-dynamic-require
      this.commands[task] = script;
    });
  }

  loadCommands(cmdList) {
    this.usageList = '';
    cmdList.forEach((cmd) => {
      const fullpath = path.join(__dirname, 'commands', cmd, `${cmd}.js`);
      const script = require(fullpath); // eslint-disable-line global-require, import/no-dynamic-require
      this.commands[cmd] = script;

      const usageObj = script.usage;
      if (usageObj) {
        const usageStrs = [];
        if (Array.isArray(usageObj)) {
          usageObj.forEach(u => usageStrs.push(u));
        } else {
          usageStrs.push(usageObj.toString());
        }

        usageStrs.forEach(u => (this.usageList += `\n- ${this.settings.bot_cmd} ${u}`));
      }
    });
  }

  init() {
    // load commands
    console.log('Loading commands...');
    this.loadCommands(this.settings.commands);

    console.log('Loading tasks...');
    this.loadTasks(this.settings.tasks);

    // setup events
    console.log('Setting up event bindings...');
    this.client
      .on('ready', this.onReady())
      .on('serverNewMember', this.serverNewMember())
      .on('message', this.onMessage())
      .on('error', this.onError());

    console.log('Connecting...');
    // return the promise from "login()"
    return this.client.login(this.token);
  }

  deinit() {
    // disconnect gracefully
    this.isReady = false;
    // return the promise from "destroy()"
    return this.client.destroy();
  }

  isAdminOrMod(member) {
    const immuneRoles = new Set(this.settings.voting.immuneRoles);
    const userRoles = new Set(member.roles.array().map(r => r.name));
    const setIntersection = [...userRoles].filter(r => immuneRoles.has(r));
    return setIntersection.length > 0;
  }
}

module.exports = TheAwesomeBot;

