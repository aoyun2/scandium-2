const botSettings = require("./botsettings.json");
const serverModule = require("./server.js");
const Discord = require("discord.js");
const fs = require("fs");
const { toHTML } = require("./ModifiedDiscordParser.js");
const fetch = require("node-fetch");
const { Server } = require("https");
const prefix = botSettings.prefix;
const bot = new Discord.Client();
bot.commands = new Discord.Collection();

// inline reply code ------------------------------ //
const { APIMessage, Webhook, Structures } = require("discord.js");

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

async function inlineReply(message, content, options) {
	var apiMessage = APIMessage.create(this, content, options).resolveData();

	const { data, files } = await apiMessage.resolveFiles();
	Object.assign(data, { message_reference: { message_id: message.id } });

	if (Array.isArray(apiMessage.data.content)) {
        return Promise.all(apiMessage.split().map(this.send.bind(this)));
	}

	console.log(data, files);
	
	return this.client.api.webhooks(this.id, this.token).post({
			data,
			files,
			query: { wait: true },
			auth: false
		}).then(d => {
			const channel = this.client.channels ? this.client.channels.cache.get(d.channel_id) : undefined;
			if (!channel) return d;
			return channel.messages.add(d, false);
		});
}

class Message extends Structures.get("Message") {
    inlineReply(content, options) {
		return this.channel.send(ExtAPIMessage.create(this, content, options, { replyTo: this }).resolveData());
    }

    edit(content, options) {
        return super.edit(ExtAPIMessage.create(this, content, options).resolveData());
    }
}
// ------------------------------------------------ //

Structures.extend("Message", () => Message);

// Webhook replies sadly do not work
// Webhook.prototype.inlineReply = inlineReply;

fs.readdir("./commands/", (err, files) => {

	if (err) {
		console.error(err);
	}

	var jsFiles = files.filter(f => f.split(".").pop() === "js");

	if (jsFiles.length <= 0) {

		console.error("No commands found.");
		return

	}

	jsFiles.forEach((f, i) => {
		var props = require("./commands/" + f);
		bot.commands.set(props.name, props);
	})
})

bot.on("ready", async () => {
	bot.user.setActivity("the funny.");
})

bot.on("message", async (message) => {
	// console.log(message)
	if(message.guild) serverModule.broadcastMessage(await processMessage(message), { server: message.guild.id, channel: message.channel.id });

	if (!message.content.includes(prefix) || message.author.bot) { return; }

	var command = message.content.split(/\s+/g)[0];
	var args = message.content.replace(`${command} `, '').split(';');
	if (args.includes(command)) args = [];

	var cmd = await bot.commands.get(command.replace(prefix, ''));

	if (cmd) {
		await cmd.run(bot, message, args);
	}
});

bot.on("messageUpdate", async (m_old, m_new) => {
	serverModule.broadcastMessageEdit(await processMessage(m_new), { server: m_new.guild.id, channel: m_new.channel.id }, m_old.id);
});

bot.on("messageDelete", async (message) => {
	serverModule.broadcastMessageDelete(message.id, { server: message.guild.id, channel: message.channel.id });
});

bot.login(botSettings.token);

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

module.exports.fetchEmojis = (id) => {
	try {
		return bot.emojis.cache.filter(e => e.guild.members.cache.get(id) !== undefined).map(e => {
			var eobj = {
				name: `:${e.name}:`, 
				guild: e.guild.name,
				string: e.toString()
			}
			return eobj;
		});
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
	// process emojis on the client-side
	var files = [];
	//console.log(m.attachments.array());
	for (const a of m.attachments.array()) {
		// console.log(a.url)

		var res = await fetch(a.url);
		var b64 = (await (res).buffer()).toString('base64')
		var url = `data:${res.headers.get("Content-Type")};base64,${b64}`;
		var name = res.headers.get("Content-Disposition") ? res.headers.get("Content-Disposition").split('=')[1] : 'N/A';

		// console.log(res.headers.get("Content-Disposition"));
		files.push({
			name: name,
			url: url,
			spoiler: a.spoiler
		});
	}

	var embeds = [];
	for (const e of m.embeds) {
		var efiles = [];
		for (a of e.files) {
			var res = await fetch(a.url);
			var b64 = (await (res).buffer()).toString('base64')
			var url = `data:${res.headers.get("Content-Type")};base64,${b64}`;
			var name = res.headers.get("Content-Disposition") ? res.headers.get("Content-Disposition").split('=')[1] : 'N/A';

			efiles.push({
				name: name,
				url: url,
				spoiler: a.spoiler
			});
		}

		var fields = [];
		for (f of e.fields) {
			fields.push({
				name: f.name ? toHTML(f.name) : null,
				value: f.value ? toHTML(f.value) : null,
			});
		}

		var b64_image = null, b64_video = null, yt_video = null, b64_thumbnail = null;

		if (e.image) {
			var res = await fetch(e.image.url);
			var b64 = (await (res).buffer()).toString('base64')
			var url = `data:${res.headers.get("Content-Type")};base64,${b64}`;

			b64_image = url;
		}

		if (e.video) {
			var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
			var match = e.video.url.match(regExp);
			if (match && match[2].length === 11) {
				// console.log("match")
				yt_video = e.video.url;
			} else {
				var res = await fetch(e.video.url);
				var b64 = (await (res).buffer()).toString('base64')
				var url = `data:${res.headers.get("Content-Type")};base64,${b64}`;

				b64_video = url;
            }
			// console.log(e.video.url)
		}

		if (e.thumbnail) {
			var res = await fetch(e.thumbnail.url);
			var b64 = (await (res).buffer()).toString('base64')
			var url = `data:${res.headers.get("Content-Type")};base64,${b64}`;

			b64_thumbnail = url;
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
		author: m.member && m.member.nickname ? (m.member.nickname + ` AKA ${m.author.username}`) : m.author.username,
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

module.exports.fetchMessages = async (userID, server, channel, before) => {
	try {
		const s = bot.guilds.cache.get(server);
		const c = s.channels.cache.get(channel);
		const u = s.members.cache.get(userID);

		if(!c.permissionsFor(u).toArray().includes("VIEW_CHANNEL")) {
			serverModule.error("Could not load messages. You may not have the permission READ_MESSAGE_HISTORY in this channel.");
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
		if (!message) return {
			id: null,
			author: null,
			color: null,
			sentAt: null,
			edited: null,
			canEdit: null,
			text: "Message either was deleted or could not be loaded.",
			attachments: null,
			embeds: null,
			reference: null,
			system: null
		}
		
		return await processMessage(message);
	} catch (e) { console.log(e); return undefined; }
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
			return (c.type === "text") && c.permissionsFor(u).toArray().includes("VIEW_CHANNEL");
		}).map(c => [c.name, c.id]);

		if (allChannels.length === 0) return ["No visible channels.", null];

		return allChannels;
	} catch (e) { console.log(e); return ["Error fetching channels.", null]; }
}

module.exports.fetchGuilds = (id) => {
	try {
		var allServers = bot.guilds.cache.filter(g => g.member(id)).map(g => [g.name, g.id]);

		console.log(allServers);
		if (allServers.length === 0) return [null, "You don't seem to be in any servers."];

		return allServers;
	} catch (e) { console.log(e); return [null, "Error fetching Servers."]; }
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

module.exports.sendMessage = async (s, c, u, data) => {
	const server = bot.guilds.cache.get(s);
	const channel = server.channels.cache.get(c);
	const user = server.members.cache.get(u);

	if(!channel.permissionsFor(user).toArray().includes("SEND_MESSAGES")) {
		serverModule.error("Error sending message. You may not have the permission SEND_MESSAGES in this channel.");
		return;
	}

	let webhooks = await channel.fetchWebhooks();
	if (Array.from(webhooks).length === 0) {
		//console.log("empty");
		await channel.createWebhook("Scandium 2");
		webhooks = await channel.fetchWebhooks();
	}

	const webhook = webhooks.first();

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

	// console.log(message)

	await webhook.send(data, {
		username: user.user.username,
		avatarURL: user.user.avatarURL({ dynamic: true })
	});
}

module.exports.replyToMessage = async (s, c, mid, u, data) => {
	try {
		const server = bot.guilds.cache.get(s);
		const channel = server.channels.cache.get(c);
		const user = server.members.cache.get(u);

		if(!channel.permissionsFor(user).toArray().includes("SEND_MESSAGES")) {
			serverModule.error("Error replying to message. You may not have the permission SEND_MESSAGES in this channel.");
			return;
		}

		var message = await channel.messages.fetch(mid)

		let webhooks = await channel.fetchWebhooks();
		if (Array.from(webhooks).length === 0) {
			//console.log("empty");
			await channel.createWebhook("Scandium 2");
			webhooks = await channel.fetchWebhooks();
		}

		const webhook = webhooks.first();

		// webhook.inlineReply(message, data, {
		// 	username: user.user.username,
		// 	avatarURL: user.user.avatarURL({ dynamic: true })
		// });

		var replyEmbed = new Discord.MessageEmbed()
			.setColor('#A3A6E8')
			.setDescription(`**Replying to [message](${message.url})**\n\n> ${message.content.length > 100 ? message.content.substring(0, 100) + "..." : message.content}`);

		webhook.send(data, {
			embeds: [replyEmbed],
			username: user.user.username,
			avatarURL: user.user.avatarURL({ dynamic: true })
		});
	} catch (e) {console.log(e);}
}

module.exports.deleteMessage = async (s, c, u, mid) => {
	try {
		const server = bot.guilds.cache.get(s);
		const channel = server.channels.cache.get(c);

		if(!channel.permissionsFor(u).toArray().includes("MANAGE_MESSAGES")) {
			serverModule.error("Could not delete message. You may not have the permission MANAGE_MESSAGES in this channel.");
			return;
		}

		var message = await channel.messages.fetch(mid)

		message.delete();
	} catch (e) {console.log(e);}
}
