const Discord = module.require("discord.js");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const redis = require("redis");

module.exports.name = "register";

module.exports.run = async (bot, message, args) => {
    if (message.author.bot) return await message.reply("Bots cannot register for a Scandium account.");
    try {
        const client = redis.createClient({
            username: 'default',
            password: 'gqhS8W5InZvcGRvzEsoXekT5nkB4lUgN',
            socket: {
                host: 'redis-14480.c232.us-east-1-2.ec2.redns.redis-cloud.com',
                port: 14480
            }
        });
        await client.connect()

        //const util = require("util");
        //var getAsync = util.promisify(client.get).bind(client);
        
        var data = await client.get(message.author.id);//await getAsync(message.author.id);
        console.log("Dataregister: " + data)
        if(data) {
            const exampleEmbed2 = new Discord.EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle("Already registered")
                    .setDescription(`You can login [here](https://scandium.onrender.com/) with the credentials:\n\n
            UserID: \`${message.author.id}\`\n
            Password: ||\`${data}\`||`);
    
            if(message.guild) message.reply("Check your DMs :mailbox_with_mail:")
            message.author.send({embeds: [exampleEmbed2]});
            client.quit();
        }
        else {
            const pass = uuidv4();

            await client.set(message.author.id, pass);
            const exampleEmbed2 = new Discord.EmbedBuilder()
                .setColor('#00ff00')
                .setTitle("Success!")
                .setDescription(`You can login [here](https://scandium-2.herokuapp.com/) with the credentials:\n\n
                UserID: \`${message.author.id}\`\n
                Password: ||\`${pass}\`||`);
            if(message.guild) message.reply("Check your DMs :mailbox_with_mail:")
            message.author.send({embeds: [exampleEmbed2]});
            client.quit();
        };
    } catch(e) {console.log(e);}
}

module.exports.help = {
    name: "register",
    desc: "register a Scandium account",
    parameters: ""
}