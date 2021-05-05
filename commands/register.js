const Discord = module.require("discord.js");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const redis = require("redis");

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

        client.unref();

        client.get(message.author.id, function(err, value) {
            if (err) throw err;
            console.log(value);
        });
        

        // const newObj = usersObj;
        // newObj[message.author.id] = pass;
        // console.log(newObj)

        // fs.writeFileSync('users.json', JSON.stringify(newObj));
    } catch(e) {console.log(e);}
}

