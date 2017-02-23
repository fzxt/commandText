const discord = require('discord.js');

module.exports = {
  usage: 'server - prints info about the server',
  run: (bot, message) => {
    const embed = new discord.RichEmbed();
    embed.setTitle('Server Owner')
            .setColor('#ff7260')
            .setAuthor(message.guild.name, message.guild.iconURL)
            .setDescription(message.guild.owner.user.username)
            .addField('Members', message.guild.members.size, true)
            .addField('Members Online', message.guild.members.filter(user => user.presence.status === 'online').size)
            .addField('Created', message.guild.createdAt.toString(), true)
            .addField('Emojis',
            message.guild.emojis.size > 0 ? message.guild.emojis.map(d => d.toString()).join(' ') : 'None');
    message.channel.sendEmbed(embed);
  },
};
