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

    let regex_str = ''
    this.settings.bot_cmds.forEach((cmd) => {
    	regex_str += cmd + '|';
    }); 

    // Remove the last |
    regex_str = regex_str.substr(0, regex_str.length - 1);

    this.cmd_re = new RegExp(`^(${regex_str})\\s+([^\\s]+)\\s*([^]*)\\s*`, 'i');
    this.cmd_noarg_re = new RegExp(`^${regex_str}[\\s]*( .*)?$`, 'i');
    console.log(this.cmd_re)

    // flags if connected and client is ready
    this.isReady = false;
  }

  isStatsSubCommand(cmd){
  	return this.settings.stats_sub_commands.indexOf(cmd) !== -1;
  }

  isKnownCommand(cmd) {
  	return (this.settings.commands.indexOf(cmd) !== -1) || this.isStatsSubCommand(cmd);
  }

  onMessage() {
    return (message) => {
      // don't respond to own messages
      if (this.client.user.username === message.author.username || message.author.bot) {
        return;
      }

      if (typeof this.tasks.statsHandler.handleMessage === 'function') {
        this.tasks.statsHandler.handleMessage(message);
      }

      // check if message is a command
      const cmdMatch = message.cleanContent.match(this.cmd_re);

      console.log('Match: ' + cmdMatch)

      // not a known command
      if (!cmdMatch || !this.isKnownCommand(cmdMatch[2])) {
        if (message.content.match(this.cmd_noarg_re)) {
          let helpText = 'If you\'re going to summon me, at least do it *right*!\n\n```';
          helpText += this.usageList;
          helpText += '```';
          message.channel.sendMessage(helpText);
        }
        return;
      }

      // process commands
      let cmd = cmdMatch[2];
      let cmdArgs = cmdMatch[3].trim();

      if( this.isStatsSubCommand(cmd) ){
      	cmd = 'stats';
      	cmdArgs = cmdMatch[2] + ' ' + cmdMatch[3].trim();
      }

      console.log('Cmd: ' + cmd);
      console.log('CmdArgs: ' + cmdArgs);

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
      this.tasks[task] = script;
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

        usageStrs.forEach(u => (this.usageList += `\n- ${this.settings.preferred_cmd} ${u}`));
      }
    });
  }

  init() {
    console.log('Loading tasks...');
    this.loadTasks(this.settings.tasks);

    // load commands
    console.log('Loading commands...');
    this.loadCommands(this.settings.commands);

    // setup events
    console.log('Setting up event bindings...');
    this.client
      .on('ready', this.onReady())
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

