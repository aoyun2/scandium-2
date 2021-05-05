const Discord = module.require("discord.js");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

module.exports.name = "register";

module.exports.run = async (bot, message, args) => {
    //return await message.reply("**register** command disabled; we are not accepting new users at this moment.")
    //await message.channel.send("Not implemented.");
    //return;

    const data = fs.readFileSync('users.json');
    const usersObj = JSON.parse(data);
    //console.log(usersObj)

    if (message.author.id in usersObj) {
        const exampleEmbed2 = new Discord.MessageEmbed()
            .setColor('#ff0000')
            .setTitle("Already registered")
            .setDescription(`You can login [here](https://localhost:3001/) with the credentials:\n\n
        UserID: \`${message.author.id}\`\n
        Password: ||\`${usersObj[message.author.id]}\`||`);

        await message.reply("Check your DMs :mailbox_with_mail:")
        return await message.author.send(exampleEmbed2);
    }

    const pass = uuidv4();

    const newObj = usersObj;
    newObj[message.author.id] = pass;

    fs.writeFileSync('users.json', JSON.stringify(newObj));

    const exampleEmbed2 = new Discord.MessageEmbed()
        .setColor('#00ff00')
        .setTitle("Success!")
        .setDescription(`You can login [here](https://localhost:3001/) with the credentials:\n\n
        UserID: \`${message.author.id}\`\n
        Password: ||\`${pass}\`||`);
    await message.reply("Check your DMs :mailbox_with_mail:")
    await message.author.send(exampleEmbed2);
}

