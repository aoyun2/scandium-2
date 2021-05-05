const Discord = require("discord.js");

module.exports.name = "invite";

module.exports.run = async (bot, message, args) => {
    try {
        var link = await bot.generateInvite({
            permissions: [8],
        });

        const e = new Discord.MessageEmbed()
            .setColor('#A3A6E8')
            .setTitle("Invite Scandium to your server:")
            .setDescription(link);
        await message.channel.send(e);
    } catch (e) {
        console.log(e.stack);
    }
}
