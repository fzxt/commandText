function handleKick(bot, member, _guild) {
  member.kick().catch((err) => {
    if (err) console.log(err);
  });
}

function handleMute(bot, member, _guild) {
  member.setMute(true).catch((err) => {
    if (err) console.log(err);
  });
}

const voteTypes = {
  kick: handleKick,
  mute: handleMute,
};

/*
 * currentVotes: dictionary of votes
 * {
 *   <type>: {
 *     <username>: {
 *       username: <username>,
 *       votes: [<people who voted],
 *       timeout: <timeoutObj>,
 *     }
 *   }
 * }
 */
const currentVotes = {};
Object.keys(voteTypes).forEach((k) => {
  currentVotes[k] = {};
});

function setIntersection(setA, setB) {
  return new Set([...setA].filter(x => setB.has(x)));
}

function processVote(type, bot, message, guild, member) {
  let voting = currentVotes[type][member.user.username];

  if (!voting) {
    // sets a timeout for this voting
    const timeoutClj = () => {
      message.channel.send(`Vote to ${type} ${member} has timed out. Phew!`);
      delete currentVotes[type][member.user.username];
    };
    const timeoutObj = setTimeout(timeoutClj, bot.settings.voting.timeout_in_minutes * 1000 * 60);

    voting = {
      username: member.user.username,
      votes: [],
      timeout: timeoutObj,
    };
    currentVotes[type][member.user.username] = voting;
  }

  // ignore votes by the same user
  if (voting.votes.indexOf(message.author.username) >= 0) {
    return;
  }
  voting.votes.push(message.author.username);
  if (voting.votes.length >= bot.settings.voting.voteThreshold) {
    clearTimeout(voting.timeout);
    message.channel.send(`Sorry, ${member}, but their wish is my command!`);
    voteTypes[type](bot, member, guild);
    delete currentVotes[type][member.user.username];
  } else {
    let msg = `[${voting.votes.length}/${bot.settings.voting.voteThreshold}]`;
    msg += ` votes to ${type} ${member}!`;
    message.channel.send(msg);
  }
}

module.exports = {
  usage: `vote <${Object.keys(voteTypes).join('|')}> <@user> - start a vote against <@user>`,

  run: (bot, message, cmdArgs) => {
    // command validation
    const voteRe = new RegExp(`^(${Object.keys(voteTypes).join('|')})`, 'i');
    const reMatch = cmdArgs.match(voteRe);
    if (!reMatch) return true;

    const guild = message.channel.guild;
    const voteType = reMatch[1];

    const user = message.mentions.users.first();
    if (!user) {
      message.channel.send('You need to specify a valid member!');
      return false;
    }
    const member = guild.members.get(user.id);

    // user validation
    // warning: assume bot is in one guild only
    if (user === message.author) {
      message.channel.send('You can\'t start a vote against yourself, silly.');
      return false;
    } else if (user === bot.client.user) {
      message.channel.send(`I'm sorry ${message.author}, I'm afraid I can't let you do that.,`);
      return false;
    }

    // roles validation
    const userRoles = new Set(member.roles.array().map(r => r.name));
    if (setIntersection(userRoles, new Set(bot.settings.voting.immuneRoles)).size > 0) {
      message.channel.send('try.is(\'nice\') === true');
      return false;
    }

    processVote(voteType, bot, message, guild, member);
    return false;
  },
};

