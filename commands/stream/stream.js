/*
   This module is meant to handle the command '!bot streams #channel'

Notes:
- streamCommands is an array with the valid stream commands for the keys in channels.js:
e.g ['!bot streams python', '!bot streams php'...]
e.g ['!bot streams remove [channel] [user]']

How it works:
- streams is an object with the following schema:

streams: {
[channel] : {
[user]: link ,
[user]: link ,
.
.
.
}
}
- streams is an in-memory-object of sorts to keep track of streams.
*/

// in memory object containing join.me stream
const streams = {};

function putStreamInObject(topic, user, link, description) {
  if (!streams[topic]) {
    streams[topic] = {};
  }

  streams[topic][user] = { link, description, channel: '' };

  // console.log(`Put in Object: Key: ${topic}, User Key: ${user}`);
}

function createChannel(title, bot, message, topic, user) {
  return message.guild.createChannel(title, 'text').then((channel) => {
    streams[topic][user].channel = channel;
    return channel;
  });
}

function setTopicToLink(channel, link, bot, topic, user) {
  return channel.setTopic(link).then(() => {
    streams[topic][user].channel = channel;
    return channel;
  });
}


function deleteStreamInObject(topic, user) {
  if (Object.keys(streams[topic]).length === 1) {
    delete streams[topic];
  } else {
    delete streams[topic][user];
  }
}


const commands = {
  create: function handleCreateStream(bot, message, args) {
    let [, topic, link, user] = args.split(' '); // eslint-disable-line prefer-const

    if (!topic || !link) {
      return message.channel.send('err, please provide topic and link!');
    }

    if (link.indexOf('http://') === -1 && link.indexOf('https://') === -1) {
      return message.channel.send('a valid link must be supplied (starting with http/https)!');
    }

    user = message.mentions.users.first();
    if (user) {
      // Creating a channel for someone else
      // The keys in the topics object are username mention id
    } else {
      // Creating a channel for you
      // The keys in the topics object are username mention id
      user = message.author;
    }
    const channelFormat = `stream_${user.username}_${topic}`;

    const defaultDescription =
      `${user} is streaming about ${topic}`;

    putStreamInObject(topic, user.id, link, defaultDescription);

    const existingChannel = bot.client.channels.get('name', channelFormat);

    if (existingChannel) {
      streams[topic][user.id].channel = existingChannel;
      streams[topic][user.id].link = link;

      existingChannel.setTopic(link).catch(err =>
        existingChannel.send('There was an error setting the existings channel topic!'));

      return message.channel.send('Channel already exists.. Updated stream link!');
    }
    return createChannel(channelFormat, bot, message, topic, user.id)
      .then(createdChannel => setTopicToLink(createdChannel, link, bot, topic, user.id))
      .then(channelWithTopic => message.channel.send(`Created ${channelWithTopic}!`))
      .catch(err => message.channel.send(`Sorry, could not create channel (${err})`));
  },

  remove: function handleRemoveStream(bot, message) {
    const user = message.mentions.users.first();

    const topics = Object.keys(streams);
    const id = user ? user.id : message.author.id;

    if (!bot.isAdminOrMod(message.member) && id !== message.author.id) {
      message.channel.send('Only admins or mods can remove others\' streams.');
      return;
    }

    topics.forEach((topic) => {
      if (streams[topic][id]) {
        const channelToDelete = streams[topic][id].channel;

        deleteStreamInObject(topic, id);

        channelToDelete.delete().catch(err =>
          message.channel.send('Sorry, could not delete channel'));

        message.channel.send(
          `Removed ${user || message.author} from active streamers list and deleted #${channelToDelete.name}`);
      } else {
        // user has no stream in this topic
        // return message.channel.send(`Could not find ${user}`);
      }
    });
  },

  list: function listStreams(bot, message) {
    let buildMessage = 'Available streams: \n';

    const topics = Object.keys(streams);

    if (topics.length === 0) {
      return message.channel.send('No streams! :frowning:');
    }

    topics.forEach((topic) => {
      buildMessage += `**\n${topic}**\n`;
      Object.keys(streams[topic]).forEach((stream, index) => {
        const link = streams[topic][stream].link;
        const description = streams[topic][stream].description;

        buildMessage += `   ${index + 1}. ${link} - ${description}\n`;
      });
    });

    return message.channel.send(buildMessage);
  },

  removeall: function removeAllStreams(bot, message) {
    if (message && !bot.isAdminOrMod(message.member)) {
      message.channel.send('Only Admins or Mods can delete all stream channels');
      return;
    }

    console.log('Removing all stream channels..');
    bot.client.guilds.first().channels.filter(channel =>
      channel && channel.name !== undefined && channel.name.startsWith('stream'))
    .forEach(channel => channel.delete());

    Object.keys(streams).forEach(topic => delete streams[topic]);
  },
};

module.exports = {
  usage: [
    'stream create <topic> <link> [@user] - creates stream about <topic> [by @user]',
    'stream list <topic> - displays streamings about <topic>',
    'stream remove <@user> - removes a streaming by <@user>',
    'stream removeall - removes every streaming (Mods only)',
  ],

  run: (bot, message, cmdArgs) => {
    const cmdFn = commands[cmdArgs.split(' ')[0]];
    if (!cmdFn) return true;
    cmdFn(bot, message, cmdArgs);
    return false;
  },

  init: (bot) => {
    commands.removeall(bot);
  },
};

