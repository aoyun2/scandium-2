const Discord = require("discord.js"); 
const https = require('https');

function handleData(result) {
    //$.each( result.data, function( idx, img ){
    let id = Math.floor(Math.random() * result.results.length)

    if (result.results.length > 0) {
	    //console.log(result.results[id].url)
        return result.results[id].media[0].gif.url;
    }
}

function request() {
	return new Promise((success, fuckedup) => {   
		const options = {
		    host: 'api.tenor.com',
		    path: '/v1/search?q=hug&key=TDTPDQSBTRRA',
		};

		https.get(options, (resp) => {
		      let data = '';
		      resp.on('data', (chunk) => {
			    data += chunk;
		      });

		      resp.on('end', () => {
			    success(data);
		      });
		}).on("error", (err) => {
		       fuckedup(err);
		});
	});
}

async function rtenor() {
    let link;
	try {
		let data = await request();
		//console.log(JSON.parse(data));
		//console.log(handleData(JSON.parse(data)))
		return handleData(JSON.parse(data));
	}
	catch(error) {
		console.log(error);
	}
}

module.exports.run = async (bot,message,args) => {  
    if (message.channel instanceof Discord.DMChannel) {
        const exampleEmbed2 = new Discord.RichEmbed()
          .setColor('#ff0000')
          .setTitle(`This command is not allowed in DMs`);
        return await message.channel.send(exampleEmbed2);
    }
  
    if (args.length != 1) {
        const exampleEmbed2 = new Discord.RichEmbed()
          .setColor('#ff0000')
          .setTitle(`Invalid command structure.`);
        return await message.channel.send(exampleEmbed2);
    }
  
    let requestedperson = String(args);
    let person = message.guild.members.find(member => member.displayName.toLowerCase().includes(requestedperson.toLowerCase()));
    if (!person)
    {
	    await message.channel.send(`Invalid person.`);
	    return;
    }
    else if(person.id === message.author.id)
    {
	    await message.channel.send(`Cannot hug yourself.`);
	    return; 
    }

    let gif = await rtenor();
	
    const exampleEmbed = new Discord.RichEmbed()
      .setColor('#A3A6E8')
      .setTitle(`**${message.author.username} hugged ${person.displayName}**`)
      .setImage(gif)
      .setTimestamp()

    await message.channel.send(exampleEmbed);
}

module.exports.help = {

    name:"hug",
    desc: "head",
    personalThoughts: "pat"

}
