const Discord = require("discord.js"); 
const https = require('https');

module.exports.name = "talksetup";

module.exports.run = async (bot,message,args) => {  
    if (message.channel instanceof Discord.DMChannel) {
        const exampleEmbed2 = new Discord.MessageEmbed()
          .setColor('#ff0000')
          .setTitle(`This command is not allowed in DMs`);
        return await message.channel.send(exampleEmbed2);
    }

    var channels = message.guild.channels.cache.filter(ch => ch.deleted == false && ch.type === 'text' && ch.topic);
    
    for (var textChat of channels) {
        if (textChat && textChat.topic && textChat.topic.includes("93a803f0-385d-495c-a5c1-b73c9bff975d")) {
              const exampleEmbed2 = new Discord.MessageEmbed()
                .setColor('#ff0000')
                .setTitle(`Scandium chat already set up in ${textChat.toString()}`);
              return await message.channel.send(exampleEmbed2);
        }
    }
  
    message.channel.setTopic("Chat with Scandium! Don't remove the token below, or set it to another channel, or you will have to reset the talk channel for this server!\n93a803f0-385d-495c-a5c1-b73c9bff975d");
    const exampleEmbed21 = new Discord.MessageEmbed()
          .setColor('#00ff7f')
          .setTitle(`Scandium chat has been set to this channel.`);
        return await message.channel.send(exampleEmbed21);
}

module.exports.help = {

    name:"talksetup",
    desc: "sets up the talk channel",
    personalThoughts: "pat"

}
