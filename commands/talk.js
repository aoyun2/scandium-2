const Discord = require("discord.js"); 
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OrganicResult, search } = require("google-sr");

module.exports.name = "talk";

async function fetchmessages(channel, limit = 25) {
    const sum_messages = [];
    let last_id;

    while (true) {
		const options = { limit: 25 };
		if (last_id) {
			options.before = last_id;
		}

		const messages = await channel.messages.fetch(options);
		sum_messages.push(...[...messages.values()].reverse());
		last_id = messages.last().id;

		if (messages.size != 100 || sum_messages.length >= limit) {
			break;
		}
	}

    return sum_messages;
}

module.exports.run = async (bot,message,args) => {
	try {
		if (args.length < 1) {
			const exampleEmbed2 = new Discord.MessageEmbed()
			.setColor('#ff0000')
			.setTitle(`Invalid command structure.`);
			return await message.channel.send(exampleEmbed2);
		}

		message.channel.sendTyping();
		// import { gpt } from "gpti";
		var msgs = await fetchmessages(message.channel);

		var today = new Date();
		var activity = bot.presence.activities[0].name;

		var context = fs.readFileSync("aicontext.txt");
		
		context += `One day, Scandium and several users are chatting in an online group chat. Past messages in the chat will be labeled as such. Today's date is ${today.toDateString()}, and the time is ${today.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}. Right now, Scandium is busy ${(activity === "eating" || activity === "doing homework" || activity === "sleeping") ? activity : " playing " + activity}.`;
		
		for(m of msgs) {
			//if (m.id === message.id) continue;
			//const member = (await m.guild).members.cache.find(member => member.id === m.author.id);
			var c = (m.cleanContent.startsWith("<>talk")) ? m.cleanContent.replace("<>talk", '') : m.cleanContent;
			context += `\nThe following text is a past message, which was sent at ${m.createdAt.toDateString()} at ${m.createdAt.toLocaleString('en-US', { hour: 'numeric', hour12: true })}:\n`;

			var repliedTo;
			if (m.reference) repliedTo = await m.channel.messages.fetch(m.reference.messageID);
			context += `${(m.author?m.author.username:m.bot.username + (repliedTo ? ", replying to " + (repliedTo.author?repliedTo.author.username:repliedTo.bot.username) : ""))}` + c + '\n';
		}
		//context += "\nThis is the current message to Scandium: \n";
		//context += (message.author.username + ": " + args.join(" ")) + "\n";
		//console.log(context);
	
		const genAI = new GoogleGenerativeAI("AIzaSyAr67O7-mX9HHvfra6UhdmiCQEhJNzS9Ww");
		const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});

		const s = await model.generateContent("Can you generate a Google search query related to this conversation?\n" + context);
		//console.log(s.response.text());
		const queryResult = await search({
			query: s.response.text(),
			// OrganicResult is the default, however it is recommended to ALWAYS specify the result type
			resultTypes: [OrganicResult],
		});
		// will return a SearchResult[]
		var d = "";
		context += "\n Here is some context for you to generate Scandium's response: \n"
		queryResult.forEach(a => {
			d += a.description + '\n';
		});
		context += d

		console.log(d)

		context += "\n Write Scandium's response below: \n";
		context += "\nScandium: ";
		const prompt = context;
		const result = await model.generateContent(prompt);
		//console.log(result.response.text());
		message.channel.send(result.response.text());
	} catch (e) {
		message.channel.send("[message error]");
		console.log(e);
	}
}

module.exports.help = {
    name: "talk",
    desc: "talk to Scandium's chat module",
    parameters: "`message`"
}
