const fs = require("fs-extra");

module.exports = {
	config: {
		name: "prefix",
		aliases: ["pre", "setprefix"],
		version: "3.0",
		author: "〲MAMUNツ࿐",
		countDown: 5,
		role: 0,
		description: "Change & show bot prefix",
		category: "config"
	},

	langs: {
		en: {
			usage:
				" 𝐏𝐑𝐄𝐅𝐈𝐗 𝐒𝐘𝐒𝐓𝐄𝐌 \n" +
				"\n" +
				" 𝐩𝐫𝐞𝐟𝐢𝐱\n" +
				" 𝐩𝐫𝐞𝐟𝐢𝐱 <𝐧𝐞𝐰𝐏𝐫𝐞𝐟𝐢𝐱>\n" +
				" 𝐩𝐫𝐞𝐟𝐢𝐱 <𝐧𝐞𝐰𝐏𝐫𝐞𝐟𝐢𝐱> -𝐠\n" +
				" 𝐩𝐫𝐞𝐟𝐢𝐱 𝐫𝐞𝐬𝐞𝐭\n" +
				"\n",

			reset:
				"𝐏𝐑𝐄𝐅𝐈𝐗 𝐑𝐄𝐒𝐄𝐓\n" +
				"\n" +
				"✅ 𝐏𝐫𝐞𝐟𝐢𝐱 𝐫𝐞𝐬𝐞𝐭 𝐬𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥!\n" +
				"🔐 𝐒𝐲𝐬𝐭𝐞𝐦 𝐩𝐫𝐞𝐟𝐢𝐱: %1\n" +
				"\n",

			onlyAdmin:
				"⛔ 𝐎𝐧𝐥𝐲 𝐛𝐨𝐭 𝐚𝐝𝐦𝐢𝐧 𝐜𝐚𝐧 𝐜𝐡𝐚𝐧𝐠𝐞 𝐠𝐥𝐨𝐛𝐚𝐥 𝐩𝐫𝐞𝐟𝐢𝐱.",

			invalid:
				"❌ 𝐏𝐫𝐞𝐟𝐢𝐱 𝐜𝐚𝐧𝐧𝐨𝐭 𝐜𝐨𝐧𝐭𝐚𝐢𝐧 𝐬𝐩𝐚𝐜𝐞𝐬 𝐨𝐫 𝐛𝐞 𝐞𝐦𝐩𝐭𝐲.",

			tooLong:
				"❌ 𝐏𝐫𝐞𝐟𝐢𝐱 𝐢𝐬 𝐭𝐨𝐨 𝐥𝐨𝐧𝐠. 𝐌𝐚𝐱𝐢𝐦𝐮𝐦 𝟏𝟎 𝐜𝐡𝐚𝐫𝐚𝐜𝐭𝐞𝐫𝐬 𝐚𝐥𝐥𝐨𝐰𝐞𝐝.",

			confirmGlobal:
				" 𝐏𝐑𝐄𝐅𝐈𝐗 𝐂𝐎𝐍𝐅𝐈𝐑𝐌\n" +
				"\n" +
				"⚙️ 𝐆𝐥𝐨𝐛𝐚𝐥 𝐩𝐫𝐞𝐟𝐢𝐱 𝐜𝐡𝐚𝐧𝐠𝐞 𝐫𝐞𝐪𝐮𝐞𝐬𝐭𝐞𝐝.\n" +
				"🆕 𝐍𝐞𝐰 𝐩𝐫𝐞𝐟𝐢𝐱: %1\n" +
				"👉 𝐑𝐞𝐚𝐜𝐭 𝐭𝐨 𝐜𝐨𝐧𝐟𝐢𝐫𝐦.\n",

			confirmThisThread:
				"𝐏𝐑𝐄𝐅𝐈𝐗 𝐂𝐎𝐍𝐅𝐈𝐑𝐌\n" +
				"\n" +
				"🏠 𝐆𝐫𝐨𝐮𝐩 𝐩𝐫𝐞𝐟𝐢𝐱 𝐜𝐡𝐚𝐧𝐠𝐞 𝐫𝐞𝐪𝐮𝐞𝐬𝐭𝐞𝐝.\n" +
				"🆕 𝐍𝐞𝐰 𝐩𝐫𝐞𝐟𝐢𝐱: %1\n" +
				"👉 𝐑𝐞𝐚𝐜𝐭 𝐭𝐨 𝐜𝐨𝐧𝐟𝐢𝐫𝐦.",

			successGlobal:
				" 𝐏𝐑𝐄𝐅𝐈𝐗 𝐔𝐏𝐃𝐀𝐓𝐄𝐃\n" +
				"\n" +
				"✅ 𝐆𝐥𝐨𝐛𝐚𝐥 𝐩𝐫𝐞𝐟𝐢𝐱 𝐜𝐡𝐚𝐧𝐠𝐞𝐝!\n" +
				"🆕 𝐍𝐞𝐰 𝐩𝐫𝐞𝐟𝐢𝐱: %1\n" +
				"\n",

			successThisThread:
				" 𝐏𝐑𝐄𝐅𝐈𝐗 𝐔𝐏𝐃𝐀𝐓𝐄𝐃\n" +
				"\n" +
				"✅ 𝐆𝐫𝐨𝐮𝐩 𝐩𝐫𝐞𝐟𝐢𝐱 𝐜𝐡𝐚𝐧𝐠𝐞𝐝!\n" +
				"🆕 𝐍𝐞𝐰 𝐩𝐫𝐞𝐟𝐢𝐱: %1\n" +
				"\n"
		}
	},

	onStart: async function ({
		message,
		role,
		args,
		commandName,
		event,
		threadsData,
		getLang
	}) {
		if (!args[0]) {
			const systemPrefix = global.GoatBot.config.prefix;
			const groupPrefix = global.utils.getPrefix(event.threadID);

			return message.reply(
` 𝐏𝐑𝐄𝐅𝐈𝐗

🌐 𝐒𝐲𝐬𝐭𝐞𝐦 : 「 ${systemPrefix} 」
🏠 𝐆𝐫𝐨𝐮𝐩  : 「 ${groupPrefix} 」`
			);
		}

		if (args[0].toLowerCase() === "reset") {
			await threadsData.set(
				event.threadID,
				null,
				"data.prefix"
			);

			return message.reply(
				getLang(
					"reset",
					global.GoatBot.config.prefix
				)
			);
		}

		const newPrefix = args[0];
		const setGlobal = args[1] === "-g";

		if (!newPrefix || /\s/.test(newPrefix))
			return message.reply(getLang("invalid"));

		if (newPrefix.length > 10)
			return message.reply(getLang("tooLong"));

		if (setGlobal && role < 2)
			return message.reply(getLang("onlyAdmin"));

		const confirmMsg = setGlobal
			? getLang("confirmGlobal", newPrefix)
			: getLang("confirmThisThread", newPrefix);

		return message.reply(confirmMsg, (err, info) => {
			if (err) return;

			global.GoatBot.onReaction.set(info.messageID, {
				commandName,
				author: event.senderID,
				newPrefix,
				setGlobal,
				threadID: event.threadID
			});
		});
	},

	onReaction: async function ({
		event,
		message,
		threadsData,
		Reaction,
		getLang
	}) {
		if (!Reaction)
			return;

		if (event.userID !== Reaction.author)
			return;

		global.GoatBot.onReaction.delete(event.messageID);

		if (Reaction.setGlobal) {
			global.GoatBot.config.prefix =
				Reaction.newPrefix;

			try {
				fs.writeFileSync(
					global.client.dirConfig,
					JSON.stringify(
						global.GoatBot.config,
						null,
						2
					)
				);
			} catch (error) {
				console.error(
					"[PREFIX] Config save error:",
					error
				);
			}

			return message.reply(
				getLang(
					"successGlobal",
					Reaction.newPrefix
				)
			);
		}

		await threadsData.set(
			Reaction.threadID || event.threadID,
			Reaction.newPrefix,
			"data.prefix"
		);

		return message.reply(
			getLang(
				"successThisThread",
				Reaction.newPrefix
			)
		);
	},

	onChat: async function ({ event, message }) {
		if (
			!event.body ||
			event.body.trim().toLowerCase() !== "prefix"
		)
			return;

		const systemPrefix =
			global.GoatBot.config.prefix;

		const groupPrefix =
			global.utils.getPrefix(event.threadID);

		return message.reply(
` 𝐏𝐑𝐄𝐅𝐈𝐗 𝐈𝐍𝐅𝐎

🌐 𝐒𝐘𝐒𝐓𝐄𝐌 𝐏𝐑𝐄𝐅𝐈𝐗
┗━━➤ 「 ${systemPrefix} 」

🏠 𝐆𝐑𝐎𝐔𝐏 𝐏𝐑𝐄𝐅𝐈𝐗
┗━━➤ 「 ${groupPrefix} 」`
		);
	}
};
