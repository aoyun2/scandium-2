const Discord = require("discord.js"); 
const https = require('https');

module.exports.name = "talksetup";

module.exports.run = async (bot,message,args) => {  
    if (message.channel instanceof Discord.DMChannel) {
        const exampleEmbed2 = new Discord.EmbedBuilder()
          .setColor('#ff0000')
          .setTitle(`This command is not allowed in DMs`);
        return await message.channel.send({ embeds: [exampleEmbed2] });
    }

    var channels = message.guild.channels.cache.filter(c => (c.type === 'text'));

    channels.forEach(c => {
        console.log(c.topic);
        if (c && c.topic && c.topic.includes("93a803f0-385d-495c-a5c1-b73c9bff975d")) {
            console.log("already setup");
              const exampleEmbed2 = new Discord.EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`Scandium chat already set up in ${c.toString()}`);
              return message.channel.send({ embeds: [exampleEmbed2] });
        }
    })
    
    message.channel.setTopic((message.channel.topic ? message.channel.topic : "") + "\nChat with Scandium! Don't remove the token below, or set it to another channel, or you will have to reset the talk channel for this server!\n93a803f0-385d-495c-a5c1-b73c9bff975d");
    const exampleEmbed21 = new Discord.EmbedBuilder()
          .setColor('#00ff7f')
          .setTitle(`Scandium chat has been set to this channel.`);
        return await message.channel.send({ embeds: [exampleEmbed21] });
}

module.exports.help = {
    name:"talksetup",
    desc: "sets up a designated talk channel",
    parameters: ""
}
