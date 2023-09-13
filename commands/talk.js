const Discord = require("discord.js"); 
const https = require('https');

module.exports.name = "talk";

module.exports.run = async (bot,message,args) => {
   	import { createCompletion, loadModel } = require('../src/gpt4all.js');

	const model = await loadModel('ggml-vicuna-7b-1.1-q4_2', { verbose: true });
	
	const response = await createCompletion(model, [
	    { role : 'system', content: 'You are meant to be annoying and unhelpful.'  },
	    { role : 'user', content: 'What is 1 + 1?'  } 
	]);

	await message.channel.send(response);
}

module.exports.help = {

    name:"talk",
    desc: "head",
    personalThoughts: "pat"

}
