const Discord = module.require("discord.js");
const botSettings = require("../botsettings.json");
const prefix = botSettings.prefix;

module.exports.name = "help";

module.exports.run = async (bot, message, args) => {
     const exampleEmbed2 = new Discord.MessageEmbed()
        .setColor('#A3A6E8')
        .setTitle("Command Structure:")
        .setDescription(`\`${prefix}<command name> <parameter 1>|<parameter 2>| ... |<parameter n>\`\n
                        eg. \`${prefix}latex https://pastebin.com/irvH8nY1 | true\`\n\n
                        **Command List:**\n
                        \`${prefix}talk <message>\`\n
                        \`${prefix}cat <no parameters>\`\n
                        \`${prefix}invite <no parameters>\`\n
                        \`${prefix}headpat <username/nickname>\`\n
                        \`${prefix}hug <username/nickname>\`\n
                        \`${prefix}kill <username/nickname>\`\n
                        \`${prefix}slap <username/nickname>\`\n
                        \`${prefix}help <no parameters>\`\n
                        \`${prefix}latex <latex code> <pastebin (if set to true, provide link)>\`\n
                        \`${prefix}latex <pastebin link> | true\`\n
                        \`${prefix}oliver <no parameters>\`\n
                        \`${prefix}quiz <time limit (in minutes)>\`\n
                        \`${prefix}register <no parameters>\`\n
                        \`${prefix}play <youtube video name>\`\n
                        \`${prefix}leave <no parameters>\`\n
                        \`${prefix}skip <no parameters (this is a sub-command of <>play, so you have to be playing something for this to work.)>\`\n
                        \`${prefix}queue <no parameters>\``);
     const channel = message.channel || message;
     await channel.send(exampleEmbed2);
}

module.exports.help = {

    name: "help",
    desc: "ok",
    personalThoughts: "weee"

}
