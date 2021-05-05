const Discord = require("discord.js");
const fetch = require("node-fetch");

module.exports.name = "devhelp";

const MAX_LINES_PER_EMBED = 20;

module.exports.run = async (bot, message, args) => {
    try {
        if (!(args[0] && args[1])) {
            const e = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setTitle("Error")
                .setDescription(`Invalid arguments to command: \`${module.exports.name}\``);
            await message.channel.send(e);

            return;
        }

        const language = args[0], query = args[1].replace(' ', '+');

        const e = new Discord.MessageEmbed()
            .setColor('#A3A6E8')
            .setTitle("Please Wait <a:scanloading:830641157419171862>")
        var pwait = await message.channel.send(e);

        fetch(`https://cht.sh/${language}/${query}\?T`)
            .then(res => res.text())
            .then(async body => {
                await pwait.delete({ timeout: 0 });

                const lines = body.split('\n');

                const e2 = new Discord.MessageEmbed()
                    .setColor('#A3A6E8')
                    .setTitle("Search Result:")
                    .setDescription(`\`\`\`${language}\n${lines.slice(0, MAX_LINES_PER_EMBED+1).join('\n')}\n\`\`\``);
                var m = await message.channel.send(e2);

                if (lines.length <= MAX_LINES_PER_EMBED) return;

                m.react('▶️')
                const c = m.createReactionCollector(
                    (reaction, user) => {
                        const users = reaction.users.cache.map(u => u.bot);
                        return ['◀️', '▶️'].includes(reaction.emoji.name) && (!user.bot) && users.includes(true);
                    },
                    { time: 3600000 }
                )

                var page = 1;
                c.on('collect', reaction => {
                    m.reactions.removeAll().then(async () => {
                        reaction.emoji.name === '◀️' ? page-- : page++;

                        const e3 = new Discord.MessageEmbed()
                            .setColor('#A3A6E8')
                            .setTitle("Search Result:")
                            .setDescription(`\`\`\`${language}\n${lines.slice((page-1) * MAX_LINES_PER_EMBED, page * MAX_LINES_PER_EMBED + 1).join('\n')}\n\`\`\``);

                        m.edit(e3);
                        if (page !== 1) await m.react('◀️');

                        if (page * MAX_LINES_PER_EMBED <= lines.length) await m.react('▶️');
                    })
                })
            });

    } catch (e) {
        console.log(e.stack);
    }
}

