const botSettings = require("./botsettings.json");
const serverModule = require("./server.js");
const Discord = require("discord.js");
const { GatewayIntentBits, Partials } = require("discord.js");
const fs = require("fs");
const { toHTML } = require("./ModifiedDiscordParser.js");
const fetch = require("node-fetch");
const prefix = botSettings.prefix;
const token = process.env.token;

const bot = new Discord.Client({
    intents: [
		GatewayIntentBits.AutoModerationExecution,
		GatewayIntentBits.DirectMessagePolls,
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.DirectMessageTyping,
		GatewayIntentBits.GuildBans,
		GatewayIntentBits.GuildEmojisAndStickers,
		GatewayIntentBits.GuildExpressions,
		GatewayIntentBits.GuildIntegrations,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessagePolls,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMessageTyping,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildScheduledEvents,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildWebhooks,
		GatewayIntentBits.MessageContent,
	],
	partials: [Partials.GatewayIntentBitsUser, Partials.Channel, Partials.Message, Partials.GuildMember, Partials.ThreadMember],
});
bot.commands = new Discord.Collection();

const cloudinary = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: process.env.cloud_name,
  api_key: process.env.cloud_key,
  api_secret: process.env.cloud_secret
});
const CLOUDINARY_REGEX = /^.+\.cloudinary\.com\/(?:[^\/]+\/)(?:(image|video)\/)?(?:(upload|fetch)\/)?(?:(?:[^_/]+_[^,/]+,?)*\/)?(?:v(\d+|\w{1,2})\/)?([^\.^\s]+)(?:\.(.+))?$/;

fs.readdir("./commands/", (err, files) => {

	if (err) {
		console.error(err);
	}

	var jsFiles = files.filter(f => f.split(".").pop() === "js");

	if (jsFiles.length <= 0) {

		console.error("No commands found.");
		return

	}
	
	//console.log(jsFiles);

	jsFiles.forEach((f, i) => {
		var props = require("./commands/" + f);
		bot.commands.set(props.name, props);
		console.log(props.name, props);
	})
})

var games = ["Terraria", "Street Fighter 6", "Honkai: Star Rail", "VALORANT", "drawing", "Listening to Spotify", "doing homework", "sleeping", "eating"];
//0.05 for games, 0.15 for hw and 0.2 for other
var weightsprefix = [0.05, 0.1, 0.2, 0.25, 0.4, 0.5, 0.6, 0.8, 1];

function randomgame() {
	var random = Math.random();
	var index = 0;
	for (var w of weightsprefix) {
		if (random <= w) break;
		index++;
	}

	return games[index];
}

bot.on("ready", async () => {
	bot.user.setActivity(randomgame());
	
	(function loop() {
	    var rand = Math.round(Math.random() * (7.2e6 - 1.8e6)) + 1.8e6;
	    setTimeout(function() {
			bot.user.setActivity(randomgame());
			loop();
	    }, rand);
	}());
})

bot.on("messageCreate", async (message) => {
	if(message.guild) serverModule.broadcastMessage(await processMessage(message), { server: message.guild.id, channel: message.channel.id });

	if ((message.author.id !== bot.user.id) && message.channel.topic && message.channel.topic.includes("93a803f0-385d-495c-a5c1-b73c9bff975d")) {
		var cmd = await bot.commands.get("talk");
		if (cmd) {
			await cmd.run(bot, message, message.content.split(/\s+/g));
			return;
		}
	}
	
	if (!message.content.includes(prefix) /*|| message.author.bot*/) { return; }
	//console.log(message);
	
	var command = message.content.split(/\s+/g)[0];
	var args = message.content.replace(`${command} `, '').split('|');

	console.log(command);
	console.log(args);
	
	if (args.includes(command)) args = [];

	var cmd = await bot.commands.get(command.replace(prefix, ''));
	//console.log(command, args, cmd);
	if (cmd && cmd === "latex") {
		let args = message.content.replace(`${command} `, '').split('|');
  		if (args.includes(command)) args = [];
		await cmd.run(bot, message, args);
	}
	else if (cmd) {
		await cmd.run(bot, message, args);
	}
});

bot.on("messageUpdate", async (m_old, m_new) => {
	if(!m_old.guild || !m_new.guild) return;
	serverModule.broadcastMessageEdit(await processMessage(m_new), { server: m_new.guild.id, channel: m_new.channel.id }, m_old.id);
});

bot.on("messageDelete", async (message) => {
	if(!message.guild) return;
	serverModule.broadcastMessageDelete(message.id, { server: message.guild.id, channel: message.channel.id });
});

bot.on('rateLimit', (info) => {
  	console.log(`Rate limit hit ${info.timeDifference ? info.timeDifference : info.timeout ? info.timeout: 'Unknown timeout '}`)
	serverModule.error("RATE_LIMIT_EXCEEDED: Discord's internal rate limit has been hit. Things may be slow for a while.", null);
})

bot.login(token).catch(console.error);
console.log(token);
console.log(process.env.redis);

// mentions

module.exports.channelName = (id) => {
	var channel = bot.channels.cache.get(id)
	return channel ? channel.name : "non-existing channel";
}

module.exports.userName = (id) => {
	try {
		return bot.users.cache.get(id).username;
	} catch (e) { console.log(e); return "non-existing user"};
}

module.exports.roleName = (sid, rid) => {
	try {
		return bot.guilds.cache.get(sid).roles.cache.get(rid).name;
	} catch (e) { console.log(e); return "non-existing role"};
}

module.exports.fetchEmojis = async (id) => {
	try {
		return await Promise.all(bot.emojis.cache.filter(e => e.guild.members.cache.get(id) !== undefined).map(async e => {
			var res = await fetch(e.url);
			var b64 = (await (res).buffer()).toString('base64');
			var url = `data:image/jpeg;base64,${b64}`;

			var eobj = {
				name: `:${e.name}:`, 
				guild: e.guild.name,
				string: e.toString(),
				url: url 
			}
			return eobj;
		}));
	} catch (e) { console.log(e); return []; };
}

module.exports.fetchUsers = (sid) => {
	try {
		return bot.guilds.cache.get(sid).members.cache.map(m => {
			var mobj = {
				name: m.user.username,
				displayname: m.displayName,
				string: m.toString()
			}
			return mobj;
		});
	} catch (e) { console.log(e); return []; };
}

module.exports.fetchRoles = (sid) => {
	try {
		return bot.guilds.cache.get(sid).roles.cache.map(r => {
			var robj = {
				name: r.name,
				string: r.toString()
			}
			return robj;
		});
	} catch (e) { console.log(e); return []; };
}


async function processMessage(m) {
	//console.log(m.content, m.channel.name)
	// process emojis on the client-side
	let files = [];
	//console.log(m.attachments.array());
	m.attachments.each(async a => {
		console.log(a);
		let res = await fetch(a.url, {headers: {'Access-Control-Expose-Headers': '*'}});
		//console.log(res.headers.get("Content-Length"));
		//let name = res.headers.get("Content-Disposition") ? res.headers.get("Content-Disposition").split('=')[1] : 'nil';
		let name;
		//console.log(a.url)
		//let b64 = (await (res).buffer()).toString('base64')
		//let url = `data:${res.headers.get("Content-Type")};base64,${b64}`;
		let url = await new Promise(resolve => {
			cloudinary.uploader.upload_large(a.url, { resource_type: "auto", chunk_size: 6000000 }, function(error, result) {
				//console.log(result, error)
				name = result.resource_type;
				if (!error) resolve(result.secure_url);
			});
		});
		//console.log(CLOUDINARY_REGEX.exec(url));
		setTimeout(() => {
			cloudinary.uploader.destroy(CLOUDINARY_REGEX.exec(url)[4], { resource_type: name }, function(result) { console.log("deleted") });
		}, 1.5 * 60 * 1000);

		// console.log(res.headers.get("Content-Disposition"));
		files.push({
			name: name,
			url: url,
			type: `data:${res.headers.get("Content-Type")}`,
			spoiler: a.spoiler
		});
		
		//global.gc();
	});

	var embeds = [];
	for (const e of m.embeds) {
		let efiles = [];
		/*for (a of e.files) {
			let res = await fetch(a.url, {headers: {'Access-Control-Expose-Headers': '*'}});
			
			let name;//res.headers.get("Content-Disposition") ? res.headers.get("Content-Disposition").split('=')[1] : 'nil';

			//let b64 = (await (res).buffer()).toString('base64')
			//let url = `data:${res.headers.get("Content-Type")};base64,${b64}`;
			let url = await new Promise(resolve => {
				cloudinary.uploader.upload_large(a.url, { resource_type: "auto", chunk_size: 6000000 }, function(error, result) {
					//console.log(result, error)
					name = result.resource_type;
					if (!error) resolve(result.secure_url);
				});
			});
			
			setTimeout(() => {
				cloudinary.uploader.destroy(CLOUDINARY_REGEX.exec(url)[4], { resource_type: name }, function(result) { console.log("deleted") });
			}, 1.5 * 60 * 1000);
			
			efiles.push({
				name: name,
				url: url,
				type: `data:${res.headers.get("Content-Type")}`,
				spoiler: a.spoiler
			});
		}*/

		let fields = [];
		for (f of e.fields) {
			fields.push({
				name: f.name ? toHTML(f.name) : null,
				value: f.value ? toHTML(f.value) : null,
			});
		}

		let b64_image = null, b64_video = null, yt_video = null, b64_thumbnail = null;

		if (e.image) {
			//let res = await fetch(e.image.url);
			//let b64 = (await (res).buffer()).toString('base64')
			//let url = `data:${res.headers.get("Content-Type")};base64,${b64}`;
			b64_image = await new Promise(resolve => {
				cloudinary.uploader.upload_large(e.image.url, { resource_type: "image", chunk_size: 6000000 }, function(error, result) {
					//console.log(result, error)
					if (!error) {
						resolve(result.secure_url);
					}
				});
			});
			
			setTimeout(() => {
				cloudinary.uploader.destroy(CLOUDINARY_REGEX.exec(b64_image)[4], { resource_type: "image" }, function(result) { console.log("deleted") });
			}, 1.5 * 60 * 1000);
		}
		
		//memory leak?
		if (e.video) {
			let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
			let match = e.video.url.match(regExp);
			if (match && match[2].length === 11) {
				// console.log("match")
				yt_video = e.video.url;
			} else {
				//console.log(e.video.url);
				/*let res = await fetch(e.video.url);
				const fileStream = fs.createWriteStream("./"+e.video.url);
				await new Promise((resolve, reject) => {
					res.body.pipe(fileStream);
					res.body.on("error", reject);
					fileStream.on("finish", resolve);
				});*/
				b64_video = await new Promise(resolve => {
				    	cloudinary.uploader.upload_large(e.video.url, { resource_type: "video", chunk_size: 6000000 }, function(error, result) {
						//console.log(result, error)						
						if (!error) resolve(result.secure_url);
					});
				});
				
				setTimeout(() => {
					cloudinary.uploader.destroy(CLOUDINARY_REGEX.exec(b64_video)[4], { resource_type: "video" }, function(result) { console.log("deleted") });
				}, 1.5 * 60 * 1000);
				//console.log(id);
				//if (id) cloudinary.uploader.destroy(id, {resource_type: 'video'}, function(result) { console.log(result) });
				
				//b64_video = (await (res).buffer());
				/*if (res.headers.get("Content-Length") > 1E7) {
					//console.log("oops");
					let buffer = (await (res).buffer());
				} else {
					let b64 = (await (res).buffer()).toString('base64');
					let url = `data:${res.headers.get("Content-Type")};base64,${b64}`;

					b64_video = url;
				}*/
            		}
			//console.log(b64_video);

			// console.log(e.video.url)
		}

		if (e.thumbnail) {
			//let res = await fetch(e.thumbnail.url);
			//let b64 = (await (res).buffer()).toString('base64')
			//let url = `data:${res.headers.get("Content-Type")};base64,${b64}`;
			b64_thumbnail = await new Promise(resolve => {
				cloudinary.uploader.upload_large(e.thumbnail.url, { resource_type: "image", chunk_size: 6000000 }, function(error, result) {
					//console.log(result, error)					
					if (!error) resolve(result.secure_url);
				});
			});
			
			setTimeout(() => {
				cloudinary.uploader.destroy(CLOUDINARY_REGEX.exec(b64_thumbnail)[4], { resource_type: "image" }, function(result) { console.log(result) });
			}, 1.5 * 60 * 1000);
		}

		var embedRules = {
			embed: true,
			escapeHTML: true,
			discordOnly: false,
			discordCallback: {}
		}

		var embed = {
			color: e.hexColor,
			title: toHTML(e.title ? e.title : '', embedRules),
			fields: fields,
			description: toHTML(e.description ? e.description : '', embedRules),
			files: efiles,
			image: b64_image,
			thumbnail: b64_thumbnail,
			video: b64_video,
			yt_video: yt_video,
			footer: e.footer ? toHTML(e.footer.text, embedRules) : null
		}

		for (var i of Object.keys(embed)) {
			if (embed[i] && embed[i].length !== 0) {
				embeds.push(embed);
				break;
            		}
        	}
	}

	var mObj = {
		id: m.id,
		author: m.member && m.member.nickname ? m.member.nickname : m.author.username,
		color: m.member ? m.member.displayHexColor : null,
		sentAt: m.createdAt,
		edited: m.editedAt ? true : false,
		canEdit: m.editable,
		text: toHTML(m.content),
		attachments: files,
		embeds: embeds,
		reference: m.reference ? m.reference.messageID : null,
		system: m.system
	}

	return JSON.stringify(mObj);
}

module.exports.fetchMessages = async (userID, server, channel, before, clientID) => {
	try {
		const s = bot.guilds.cache.get(server);
		const c = s.channels.cache.get(channel);
		const u = s.members.cache.get(userID);

		if(!c.permissionsFor(u).toArray().includes("ReadMessageHistory")) {
			serverModule.error("SCANDIUM_LOAD_ERROR: You may not have the permission READ_MESSAGE_HISTORY in this channel.", clientID);
			return undefined;
		}

		var messages = await Promise.all((await c.messages.fetch({ limit: 10, before: before })).map(async m => {
			return await processMessage(m);
		}));

		// console.log(messages);
		return messages;
	} catch (e) { console.log(e); return undefined; }
}

module.exports.fetchMessage = async (server, channel, id) => {
	try {
		const s = bot.guilds.cache.get(server);
		const c = s.channels.cache.get(channel);

		var message = await c.messages.fetch(id);

		// console.log(s, c);
		if (!message) return null;
		else return await processMessage(message);
	} catch (e) { console.log(e); return null; }
}

module.exports.fetchChannels = (server, id) => {
	try {
		const s = bot.guilds.cache.get(server);
		const u = s.members.cache.get(id);

		var allChannels = s.channels.cache.sort(function (a, b) {
			return a.rawPosition - b.rawPosition;
		});

		// change this to only load channels that are visible to the user
		allChannels = allChannels.filter(c => {
			return (c.type===Discord.ChannelType.GuildText) && c.permissionsFor(u).toArray().includes("ViewChannel");
		}).map(c => [c.name, c.id]);

		if (allChannels.length === 0) return [["No visible channels.", null]];

		return allChannels;
	} catch (e) { console.log(e); return [["Error fetching channels.", null]]; }
}

module.exports.fetchGuilds = (id) => {
	try {
		var allServers = bot.guilds.cache.filter(g => g.members.fetch(id)).map(g => [g.name, g.id]);

		console.log(allServers);
		if (!allServers.length) return [["You don't seem to be in any servers.", null]];

		return allServers;
	} catch (e) { console.log(e); return [["Error fetching Servers.", null]]; }
}

module.exports.fetchPermissions = (server, channel, id) => {
	try {
		const s = bot.guilds.cache.get(server);
		const c = s.channels.cache.get(channel);
		const u = s.members.cache.get(id);

		// console.log(server, channel, id)

		return c.permissionsFor(u).toArray();
	} catch (e) { console.log(e); return []; }
}

// Zero-Width Fingerprinting
function chunkify(a, n, balanced) {
    if (n < 2) return [a];

    var len = a.length,
        out = [],
        i = 0,
        size;

    if (len % n === 0) {
        size = Math.floor(len / n);
        while (i < len) {
            out.push(a.slice(i, i += size));
        }
    } else if (balanced) {
        while (i < len) {
            size = Math.ceil((len - i) / n--);
            out.push(a.slice(i, i += size));
        }
    } else {
        n--;
        size = Math.floor(len / n);
        if (len % size === 0) size--;
        while (i < size * n) {
            out.push(a.slice(i, i += size));
        }
        out.push(a.slice(size * n));
    }
    return out;
}

const zeroPad = num => "00000000".slice(String(num).length) + num;

const stringToBinary = text => text.split("").map(char => zeroPad(char.charCodeAt(0).toString(2))).join(" ");

const binaryToString = binary => binary.split(" ").map(el => String.fromCharCode(parseInt(el, 2))).join("");

const binaryToZeroWidth = binary => binary.split("").map(binaryNum => {
    const num = parseInt(binaryNum, 10);
    if (num === 1) {
        return "​";
    } else if (num === 0) {
        return "‌";
    }
    return "‍";
}).join("");

const zeroWidthToBinary = string => string.split("").map(char => {
    if (char === "​") {
        return "1";
    } else if (char === "‌") {
        return "0";
    } else if (char === "‍") {
        return " ";
    }
    return "";
}).join("");

const stringToZeroWidth = string => binaryToZeroWidth(stringToBinary(string));

const zeroWidthToString = zeroWidth => {
    if (zeroWidth.length > 0) return binaryToString(zeroWidthToBinary(zeroWidth));
    else return "";
};

const fingerprintText = (text, secret) => {
    let textArr = text.split("");
    let encsec = stringToZeroWidth(secret);

    let result = "";

    let numOfSpaces = textArr.reduce((pre, cur) => {
        if (cur === " ") return ++pre;
        else return pre;
    }, 0);

    let textNoSpace = text.split(" ");

    if (numOfSpaces === 0) {
        result = encsec + text;
    } else if (numOfSpaces > encsec.length) {
        for (let i = 0; i < encsec.length; i++) {
            result += textNoSpace[0] + encsec.charAt(i) + " ";
            textNoSpace.splice(0, 1);
        }
        result += textNoSpace.join(" ");
    } else {
        let encsecArr = chunkify(encsec.split(""), numOfSpaces, true).map(el => el.join(""));
        for (let i = 0; i < encsecArr.length; i++) {
            result += textNoSpace[0] + encsecArr[i] + " ";
            textNoSpace.splice(0, 1);
        }
        result += textNoSpace.join(" ");
    }

    return result;
};

function encode(secret, text) {
    //let secret = document.getElementById("secret").value;
    //let text = document.getElementById("text").value;
    return fingerprintText(text, secret);
}

function decode(text) {
    let decoded = zeroWidthToString(text);
    return decoded;
}

module.exports.sendMessage = async (s, c, u, data, clientID) => {
	try {
		const server = bot.guilds.cache.get(s);
		const channel = server.channels.cache.get(c);
		const user = server.members.cache.get(u);

		if(!channel.permissionsFor(user).toArray().includes("SendMessages")) {
			serverModule.error("SCANDIUM_SEND_ERROR: You may not have the permission SEND_MESSAGES in this channel.", clientID);
			return;
		}

		let webhooks = await channel.fetchWebhooks();
		/*if (!webhooks || webhooks.length <= 0) {
			//console.log("empty");
			await channel.createWebhook("Scandium 2");
			webhooks = await channel.fetchWebhooks();
		}*/

		let webhook = webhooks.first();
		if (webhook) {
			await webhook.delete();	
		}
		webhook = await channel.createWebhook({name: "Scandium"});
		console.log(webhook)
		// var message = data;

		// var emojis = message.match(/:[^:\s]*(?:::[^:\s]*)*:/g) || [];
		// var channels = message.match(/#([a-zA-Z0-9_-]*)/g) || [];
		// var mentions = message.match(/@([^ ]*)/g) || [];

		// console.log(emojis, channels, mentions)

		// for (var e of emojis) {
		// 	console.log(e)
		// 	var emoji = server.emojis.cache.find(em => { return `:${em.name}:` == e })

		// 	if (emoji) {
		// 		var emoji_text = emoji.toString();
		// 		message = message.replace(e, emoji_text);
		// 	}
		// }

		// for (var c of channels) {
		// 	console.log(c)
		// 	var mentioned_channel = server.channels.cache.find(cn => `#${cn.name}` == c);
		// 	console.log(c, mentioned_channel);

		// 	if (mentioned_channel) {
		// 		var channel_text = mentioned_channel.toString();
		// 		message = message.replace(c, channel_text);
		// 	}
		// }

		// for (var m of mentions) {
		// 	console.log(m)
		// 	var mention = server.members.cache.find(mb => `@${mb.displayName}`.replace(' ', '_') === m || `@${mb.user.username}`.replace(' ', '_') === m) || server.roles.cache.find(r => `@${r.name}` === m);
		// 	console.log(m, mention);

		// 	if (mention) {
		// 		var mention_text = mention.toString();
		// 		message = message.replace(m, mention_text);
		// 	}
		// }

		 
		let id = (user.id | 85926).toString(36);
		const embed = new Discord.EmbedBuilder()
			.setColor('#A3A6E8')
			.setDescription(`\`\`\`${id}\n \`\`\``);
		
		var ms = await webhook.send({
			content: encode(id, data),
			username: user.user.username,
			avatarURL: user.user.avatarURL({dynamic: true})//,
			//embeds: [embed]
		});
		console.log(encode(id, user.user.username));
		//await channel.messages.edit(ms, { flags: ['SUPPRESS_EMBEDS'] });
	} catch(e) {serverModule.error(e.message, clientID);};
}

module.exports.replyToMessage = async (s, c, mid, u, data, clientID) => {
	try {
		const server = bot.guilds.cache.get(s);
		const channel = server.channels.cache.get(c);
		const user = server.members.cache.get(u);

		if(!channel.permissionsFor(user).toArray().includes("SendMessages")) {
			serverModule.error("SCANDIUM_REPLY_ERROR: You may not have the permission SEND_MESSAGES in this channel.", clientID);
			return;
		}

		var message = await channel.messages.fetch(mid);

		let webhooks = await channel.fetchWebhooks();
		/*if (!webhooks || webhooks.length <= 0) {
			//console.log("empty");
			await channel.createWebhook("Scandium 2");
			webhooks = await channel.fetchWebhooks();
		}*/

		let webhook = webhooks.first();
		if (webhook) {
			await webhook.delete();	
		}
		webhook = await channel.createWebhook("Scandium 2");
		//console.log(webhook)

		// webhook.inlineReply(message, data, {
		// 	username: user.user.username,
		// 	avatarURL: user.user.avatarURL({ dynamic: true })
		// });

		var replyEmbed = new Discord.MessageEmbed()
			.setColor('#A3A6E8')
			.setDescription(`**Replying to [message](${message.url})**\n\n> ${message.content.length > 100 ? message.content.substring(0, 100) + "..." : message.content}`);
		
		let id = (user.id | 85926).toString(36);
		const embed = new Discord.MessageEmbed()
			.setColor('#A3A6E8')
			.addField("\u200b", `\`\`\`${id}\nhttp://scandium-2.herokuapp.com\`\`\``);
		var ms = await webhook.send(encode(id, data), {
			embeds: [replyEmbed],
			username: user.user.username,
			avatarURL: user.user.avatarURL({dynamic: true}),
		});
		console.log(encode(id, user.user.username));
		//await channel.messages.edit(ms, { flags: ['SUPPRESS_EMBEDS'] });
	} catch (e) {serverModule.error(e.message, clientID);}
}

module.exports.editMessage = async (s, c, mid, u, data, clientID) => {
	try {
		const server = bot.guilds.cache.get(s);
		const channel = server.channels.cache.get(c);
		const user = server.members.cache.get(u);

		if(!channel.permissionsFor(user).toArray().includes("ManageMessages")) {
			serverModule.error("SCANDIUM_EDIT_ERROR: You may not have the permission MANAGE_MESSAGES in this channel.", clientID);
			return;
		}

		var message = await channel.messages.fetch(mid);
		var webhook = await message.fetchWebhook();

		var userSnowflakeThing = (user.id | 85926).toString(36);

		// var userURL = await fetch(user.user.avatarURL());
		// var userb64 = (await (userURL).buffer()).toString('base64')
		// var userAvatar = `data:${userURL.headers.get("Content-Type")};base64,${userb64}`;

		// var webhookURL = await fetch(user.user.avatarURL());
		// var webhookb64 = (await (webhookURL).buffer()).toString('base64')
		// var webhookAvatar = `data:${webhookURL.headers.get("Content-Type")};base64,${webhookb64}`;
		//console.log(userSnowflakeThing);
		//console.log(user.user.avatarURL({dynamic: true}).split('?id=').pop());
		//var e = message.embeds.filter(em => em.title === "");
		//var yes = message.embeds[message.embeds.length - 1].description;
		console.log(message.content);
		var yes = decode(message.content);
		console.log(yes);
		if(!message.webhookID || webhook.owner.id != 829863259033042965 || !yes.includes(userSnowflakeThing)) {
			serverModule.error("SCANDIUM_EDIT_ERROR: Cannot edit messages of other, or non-scandium users.", clientID);
			return;
		}

		// webhook.editMessage(message, data);

		const axios = require('axios');

		var res = await axios.patch(`https://discord.com/api/webhooks/${message.webhookID}/${webhook.token}/messages/${mid}`, 
			{
				content: data
			},
			{
				headers: {
					Authorization: 'Bot ' + token
				}
			}
		);
		//console.log(res)
	} catch(e) {serverModule.error(e.message, clientID);}
}

module.exports.deleteMessage = async (s, c, u, mid, clientID) => {
	try {
		const server = bot.guilds.cache.get(s);
		const channel = server.channels.cache.get(c);
		const user = server.members.cache.get(u);

		if(!channel.permissionsFor(user).toArray().includes("ManageMessages")) {
			serverModule.error("SCANDIUM_DELETE_ERROR: You may not have the permission MANAGE_MESSAGES in this channel.", clientID);
			return;
		}

		var message = await channel.messages.fetch(mid)

		message.delete();
	} catch (e) {serverModule.error(e.message, clientID);}
}
