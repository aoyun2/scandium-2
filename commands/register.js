const Discord = module.require("discord.js");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const redis = require("redis");

const { APIMessage, Structures } = require("discord.js");

class ExtAPIMessage extends APIMessage {
    resolveData() {
        if (this.data) return this;
        super.resolveData();
        if ((this.options.allowedMentions || {}).repliedUser !== undefined) {
            if (this.data.allowed_mentions === undefined) this.data.allowed_mentions = {};
            Object.assign(this.data.allowed_mentions, { replied_user: this.options.allowedMentions.repliedUser });
            delete this.options.allowedMentions.repliedUser;
        }
        if (this.options.replyTo !== undefined) {
            Object.assign(this.data, { message_reference: { message_id: this.options.replyTo.id } });
        }
        return this;
    }
}

class Message extends Structures.get("Message") {
    inlineReply(content, options) {
        return this.channel.send(ExtAPIMessage.create(this, content, options, { replyTo: this }).resolveData());
    }

    edit(content, options) {
        return super.edit(ExtAPIMessage.create(this, content, options).resolveData());
    }
}



module.exports.name = "register";

module.exports.run = async (bot, message, args) => {
    //return await message.reply("**register** command disabled; we are not accepting new users at this moment.")
    //await message.channel.send("Not implemented.");
    //return;

    // const data = fs.readFileSync('users.json');
    // const usersObj = JSON.parse(data);
    // console.log(usersObj)

    try {
        const client = redis.createClient(process.env.REDIS_URL || "redis://:p4ddbbfa3213866833993a412cecf086db781eac1558af21fd0ef5f3d8ee2f335@ec2-184-72-229-210.compute-1.amazonaws.com:19029");
        const util = require("util");
        var getAsync = util.promisify(client.get).bind(client);
        
        var data = await getAsync(message.author.id);
        console.log(data)
        if(data) {
            const exampleEmbed2 = new Discord.MessageEmbed()
                    .setColor('#ff0000')
                    .setTitle("Already registered")
                    .setDescription(`You can login [here](https://scandium-2.herokuapp.com/) with the credentials:\n\n
            UserID: \`${message.author.id}\`\n
            Password: ||\`${data}\`||`);
    
            if(message.guild) message.inlineReply("Check your DMs :mailbox_with_mail:")
            message.author.send(exampleEmbed2);
            client.quit();
        }
        else {
            const pass = uuidv4();

            client.set(message.author.id, pass);
            const exampleEmbed2 = new Discord.MessageEmbed()
                .setColor('#00ff00')
                .setTitle("Success!")
                .setDescription(`You can login [here](https://scandium-2.herokuapp.com/) with the credentials:\n\n
                UserID: \`${message.author.id}\`\n
                Password: ||\`${pass}\`||`);
            if(message.guild) message.inlineReply("Check your DMs :mailbox_with_mail:")
            message.author.send(exampleEmbed2);
            client.quit();
        };

        // const newObj = usersObj;
        // newObj[message.author.id] = pass;
        // console.log(newObj)

        // fs.writeFileSync('users.json', JSON.stringify(newObj));
    } catch(e) {console.log(e);}
}

