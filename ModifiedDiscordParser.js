const markdown = require('simple-markdown');
const highlight = require('highlight.js');
const request = require("sync-request");

function htmlTag(tagName, content, attributes, isClosed = true, state = {}) {
	if (typeof isClosed === 'object') {
		state = isClosed;
		isClosed = true;
	}

	if (!attributes)
		attributes = {};

	if (attributes.class && state.cssModuleNames)
		attributes.class = attributes.class.split(' ').map(cl => state.cssModuleNames[cl] || cl).join(' ');

	let attributeString = '';
	for (let attr in attributes) {
		// Removes falsy attributes
		if (Object.prototype.hasOwnProperty.call(attributes, attr) && attributes[attr])
			attributeString += ` ${markdown.sanitizeText(attr)}="${markdown.sanitizeText(attributes[attr])}"`;
	}

	let unclosedTag = `<${tagName}${attributeString}>`;

	if (isClosed)
		return unclosedTag + content + `</${tagName}>`;
	return unclosedTag;
}
markdown.htmlTag = htmlTag;

const rules = {
	blockQuote: Object.assign({}, markdown.defaultRules.blockQuote, {
		match: function (source, state, prevSource) {
			return !/^$|\n *$/.test(prevSource) || state.inQuote ? null : /^( *>>> ([\s\S]*))|^( *> [^\n]*(\n *> [^\n]*)*\n?)/.exec(source);
		},
		parse: function (capture, parse, state) {
			const all = capture[0];
			const isBlock = Boolean(/^ *>>> ?/.exec(all));
			const removeSyntaxRegex = isBlock ? /^ *>>> ?/ : /^ *> ?/gm;
			const content = all.replace(removeSyntaxRegex, '');

			return {
				content: parse(content, Object.assign({}, state, { inQuote: true })),
				type: 'blockQuote'
			}
		}
	}),
	codeBlock: Object.assign({}, markdown.defaultRules.codeBlock, {
		match: markdown.inlineRegex(/^```(([a-z0-9-]+?)\n+)?\n*([^]+?)\n*```/i),
		parse: function (capture, parse, state) {
			return {
				lang: (capture[2] || '').trim(),
				content: capture[3] || '',
				inQuote: state.inQuote || false
			};
		},
		html: (node, output, state) => {
			let code;
			if (node.lang && highlight.getLanguage(node.lang))
				code = highlight.highlight(node.content, { language: node.lang, ignoreIllegals: true}); // Discord seems to set ignoreIllegals: true

			if (code && state.cssModuleNames) // Replace classes in hljs output
				code.value = code.value.replace(/<span class="([a-z0-9-_ ]+)">/gi, (str, m) =>
					str.replace(m, m.split(' ').map(cl => state.cssModuleNames[cl] || cl).join(' ')));

			return htmlTag('pre', htmlTag(
				'code', code ? code.value : markdown.sanitizeText(node.content), { class: `hljs${code ? ' ' + code.language : ''}` }, state
			), null, state);
		}
	}),
	newline: markdown.defaultRules.newline,
	escape: markdown.defaultRules.escape,
	autolink: Object.assign({}, markdown.defaultRules.autolink, {
		parse: capture => {
			return {
				content: [{
					type: 'text',
					content: capture[1]
				}],
				target: capture[1]
			};
		},
		html: (node, output, state) => {
			// console.log("autolink", node.content);
			return htmlTag('a', output(node.content, state), { href: markdown.sanitizeUrl(node.target) }, state);
		}
	}),
	url: Object.assign({}, markdown.defaultRules.url, {
		parse: capture => {
			return {
				content: [{
					type: 'text',
					content: capture[1]
				}],
				target: capture[1]
			}
		},
		html: (node, output, state) => {
			var link = htmlTag('a', output(node.content, state), { href: markdown.sanitizeUrl(node.target) }, state);
			//var res = request('GET', markdown.sanitizeUrl(node.target));

			//var type = res.headers["content-type"];
			//// console.log(type);

			//switch (type.split('/')[0]) {
			//	case "image":
			//		var url = `data:${type};base64,${res.getBody().toString("base64")}`;

			//		var image = htmlTag('img', '', {
			//			class: `d-image-embed`,
			//			src: url,
			//			alt: `Epic embed fail.`
			//		}, false, state);

			//		var output = htmlTag('div', link + htmlTag("br", null, null, false) + image, null);

			//		return output ? output : link;
			//	case "video":
			//		var url = `data:${type};base64,${res.getBody().toString("base64")}`;

			//		var video = htmlTag('video', '', {
			//			class: `d-video-embed`,
			//			src: url,
			//			controls: true
			//		}, false, state);

			//		var output = htmlTag('div', link + htmlTag("br", null, null, false) + video, null);

			//		return output ? output : link;
			//	case "audio":
			//		var url = `data:${type};base64,${res.getBody().toString("base64")}`;

			//		var audio = htmlTag('audio', '', {
			//			class: `d-audio-embed`,
			//			src: url,
			//			controls: true
			//		}, false, state);

			//		var output = htmlTag('div', link + htmlTag("br", null, null, false) + audio, null);

			//		return output ? output : link;
			//	default:
			//		return link;
			//}
			return link;
		}
	}),
	em: Object.assign({}, markdown.defaultRules.em, {
		parse: function (capture, parse, state) {
			const parsed = markdown.defaultRules.em.parse(capture, parse, Object.assign({}, state, { inEmphasis: true }));
			return state.inEmphasis ? parsed.content : parsed;
		},
	}),
	strong: markdown.defaultRules.strong,
	u: markdown.defaultRules.u,
	strike: Object.assign({}, markdown.defaultRules.del, {
		match: markdown.inlineRegex(/^~~([\s\S]+?)~~(?!_)/),
	}),
	inlineCode: Object.assign({}, markdown.defaultRules.inlineCode, {
		match: source => markdown.defaultRules.inlineCode.match.regex.exec(source),
		html: function (node, output, state) {
			return htmlTag('code', markdown.sanitizeText(node.content.trim()), null, state);
		}
	}),
	text: Object.assign({}, markdown.defaultRules.text, {
		match: source => /^[\s\S]+?(?=[^0-9A-Za-z\s\u00c0-\uffff-]|\n\n|\n|\w+:\S|$)/.exec(source),
		html: function (node, output, state) {
			if (state.escapeHTML)
				return markdown.sanitizeText(node.content);

			return node.content;
		}
	}),
	emoticon: {
		order: markdown.defaultRules.text.order,
		match: source => /^(¯\\_\(ツ\)_\/¯)/.exec(source),
		parse: function (capture) {
			return {
				type: 'text',
				content: capture[1]
			};
		},
		html: function (node, output, state) {
			return output(node.content, state);
		},
	},
	br: Object.assign({}, markdown.defaultRules.br, {
		match: markdown.anyScopeRegex(/^\n/),
	}),
	spoiler: {
		order: 0,
		match: source => /^\|\|([\s\S]+?)\|\|/.exec(source),
		parse: function (capture, parse, state) {
			return {
				content: parse(capture[1], state)
			};
		},
		html: function (node, output, state) {
			return htmlTag('span', output(node.content, state), { class: 'd-spoiler' }, state);
		}
	}
};

const discordCallbackDefaults = {
	user: node => '@' + markdown.sanitizeText(node.id),
	channel: node => '#' + markdown.sanitizeText(node.id),
	role: node => '&' + markdown.sanitizeText(node.id),
	everyone: () => '@everyone',
	here: () => '@here'
};

const rulesDiscord = {
	discordUser: {
		order: markdown.defaultRules.strong.order,
		match: source => /^<@!?([0-9]*)>/.exec(source),
		parse: function (capture) {
			return {
				id: capture[1]
			};
		},
		html: function (node, output, state) {
			return htmlTag('span', '<@!' + node.id + '>', { id: node.id, class: 'd-mention d-user' }, state);
		}
	},
	discordChannel: {
		order: markdown.defaultRules.strong.order,
		match: source => /^<#([0-9]*)>/.exec(source),
		parse: function (capture) {
			return {
				id: capture[1]
			};
		},
		html: function (node, output, state) {
			return htmlTag('span', '<#' + node.id + '>', { id: node.id, class: 'd-mention d-channel' }, state);
		}
	},
	discordRole: {
		order: markdown.defaultRules.strong.order,
		match: source => /^<@&([0-9]*)>/.exec(source),
		parse: function (capture) {
			return {
				id: capture[1]
			};
		},
		html: function (node, output, state) {
			return htmlTag('span', '<@&' + node.id + '>', { id: node.id, class: 'd-mention d-role' }, state);
		}
	},
	discordEmoji: {
		order: markdown.defaultRules.strong.order,
		match: source => /^<(a?):(\w+):(\d+)>/.exec(source),
		parse: function (capture) {
			return {
				animated: capture[1] === "a",
				name: capture[2],
				id: capture[3],
			};
		},
		html: function (node, output, state) {
			var res = request('GET', `https://cdn.discordapp.com/emojis/${node.id}.${node.animated ? 'gif' : 'png'}`);
			var url = `data:image/${node.animated ? 'gif' : 'png'};base64,${res.getBody().toString("base64")}`;

			var toolTip = htmlTag('span', `:${node.name}:`, { class: "tooltiptext" });

			var image =  htmlTag('img', '', {
				class: `d-emoji${node.animated ? ' d-emoji-animated' : ''}`,
				src: url, 
				alt: `:${node.name}:`
			}, false, state);

			return htmlTag('div', image + toolTip, {class: `d-emoji-container`});
		}
	},
	discordEveryone: {
		order: markdown.defaultRules.strong.order,
		match: source => /^@everyone/.exec(source),
		parse: function () {
			return {};
		},
		html: function (node, output, state) {
			return htmlTag('span', state.discordCallback.everyone(node), { class: 'd-mention d-user' }, state);
		}
	},
	discordHere: {
		order: markdown.defaultRules.strong.order,
		match: source => /^@here/.exec(source),
		parse: function () {
			return {};
		},
		html: function (node, output, state) {
			return htmlTag('span', state.discordCallback.here(node), { class: 'd-mention d-user' }, state);
		}
	}
};

Object.assign(rules, rulesDiscord);

const rulesDiscordOnly = Object.assign({}, rulesDiscord, {
	text: Object.assign({}, markdown.defaultRules.text, {
		match: source => /^[\s\S]+?(?=[^0-9A-Za-z\s\u00c0-\uffff-]|\n\n|\n|\w+:\S|$)/.exec(source),
		html: function (node, output, state) {
			if (state.escapeHTML)
				return markdown.sanitizeText(node.content);

			return node.content;
		}
	})
});

const rulesEmbed = Object.assign({}, rules, {
	link: markdown.defaultRules.link
});

const parser = markdown.parserFor(rules);
const htmlOutput = markdown.outputFor(rules, 'html');
const parserDiscord = markdown.parserFor(rulesDiscordOnly);
const htmlOutputDiscord = markdown.outputFor(rulesDiscordOnly, 'html');
const parserEmbed = markdown.parserFor(rulesEmbed);
const htmlOutputEmbed = markdown.outputFor(rulesEmbed, 'html');

/**
 * Parse markdown and return the HTML output
 * @param {String} source Source markdown content
 * @param {Object} [options] Options for the parser
 * @param {Boolean} [options.embed=false] Parse as embed content
 * @param {Boolean} [options.escapeHTML=true] Escape HTML in the output
 * @param {Boolean} [options.discordOnly=false] Only parse Discord-specific stuff (such as mentions)
 * @param {Object} [options.discordCallback] Provide custom handling for mentions and emojis
 * @param {Object} [options.cssModuleNames] An object mapping css classes to css module classes
 */
function toHTML(source, options, customParser, customHtmlOutput) {
	if ((customParser || customHtmlOutput) && (!customParser || !customHtmlOutput))
		throw new Error('You must pass both a custom parser and custom htmlOutput function, not just one');

	options = Object.assign({
		embed: false,
		escapeHTML: true,
		discordOnly: false,
		discordCallback: {}
	}, options || {});

	let _parser = parser;
	let _htmlOutput = htmlOutput;
	if (customParser) {
		_parser = customParser;
		_htmlOutput = customHtmlOutput;
	} else if (options.discordOnly) {
		_parser = parserDiscord;
		_htmlOutput = htmlOutputDiscord;
	} else if (options.embed) {
		_parser = parserEmbed;
		_htmlOutput = htmlOutputEmbed;
	}

	const state = {
		inline: true,
		inQuote: true,
		inEmphasis: false,
		escapeHTML: options.escapeHTML,
		cssModuleNames: options.cssModuleNames || null,
		discordCallback: Object.assign({}, discordCallbackDefaults, options.discordCallback)
	};

	return _htmlOutput(_parser(source, state), state);
}

module.exports = {
	parser: source => parser(source, { inline: true }),
	htmlOutput,
	toHTML,
	rules,
	rulesDiscordOnly,
	rulesEmbed,
	markdownEngine: markdown,
	htmlTag
};

