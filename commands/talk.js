const Discord = require("discord.js"); 
const https = require('https');

module.exports.name = "talk";

async function fetchmessages(channel, limit = 300) {
    const sum_messages = [];
    let last_id;

    while (true) {
	const options = { limit: 100 };
	if (last_id) {
	    options.before = last_id;
	}

	const messages = await channel.fetchMessages(options);
	sum_messages.push(...messages.array());
	last_id = messages.last().id;

	if (messages.size != 100 || sum_messages >= limit) {
	    break;
	}
    }

    return sum_messages;
}

module.exports.run = async (bot,message,args) => {
   	// import { gpt } from "gpti";
	var msgs = await fetchmessages(message.channel);
	var context = '';
	for(m of msgs) {
		const member = await m.guild.member(m.author);
		context += (member.displayName + ": " + m.content + '\n');
	}

	const mb = await message.guild.member(message.author);
	context += `Respond to ${mb.displayName} like an anime girl`;
	console.log(context);
	
	const { gpt } = require("gpti");
	
	gpt({
	    prompt: context,
	    model: "gpt-4",                         // code or model
	    type: "json"                            // optional: "json" or "markdown"
	}, (err, data) => {
	    if(err != null){
	        console.log(err);
	    } else {
	        console.log(data);
		message.channel.send(data);
	    }
	});
}

module.exports.help = {

    name:"talk",
    desc: "head",
    personalThoughts: "pat"

}
