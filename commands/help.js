const Discord = module.require("discord.js");
const botSettings = require("../botsettings.json");
const fs = require("fs");
const prefix = botSettings.prefix;

module.exports.name = "help";

module.exports.run = async (bot, message, args) => {

    fs.readdir("./commands/", (err, files) => {
        if (err) {
            console.error(err);
        }
    
        var jsFiles = files.filter(f => f.split(".").pop() === "js");
    
        if (jsFiles.length <= 0) {
    
            console.error("No commands found.");
            return
    
        }

        const exampleEmbed2 = new Discord.EmbedBuilder()
        .setColor('#A3A6E8')
        .setTitle("Command Structure:")

        jsFiles.forEach((f, i) => {
            var props = require('./'+f).help;
            exampleEmbed2.addFields({name: `${prefix+props.name} ${props.parameters}`, value: `${props.desc}`});
        })
        
        const channel = message.channel;
        channel.send({ embeds: [exampleEmbed2] });
    })
}

module.exports.help = {
    name: "help",
    desc: "provides a list of all the commands",
    parameters: "none",
}
