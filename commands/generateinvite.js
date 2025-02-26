const Discord = require("discord.js");

module.exports.name = "invite";

module.exports.run = async (bot, message, args) => {
    try {
        var link = await bot.generateInvite({
            scopes: ['bot', 'applications.commands'],
            permissions: Discord.PermissionsBitField.All,
        });

        const e = new Discord.EmbedBuilder()
            .setColor('#A3A6E8')
            .setTitle("Invite Scandium to your server:")
            .setDescription(`[link](${link})`);
        await message.channel.send({ embeds: [e] });
    } catch (e) {
        console.log(e.stack);
    }
}

module.exports.help = {
    name: "invite",
    desc: "invite the bot to your server",
    parameters: "",
}
