const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
	config: {
		name: "admin",
		aliases: ["abal", "operator", "op"],
		version: "3.1",
		author: "〲MAMUNツ࿐ T.T o.O",
		countDown: 5,
		role: 0,
		shortDescription: {
			en: "Operator system"
		},
		longDescription: {
			en: "Add/remove operator and view operator list"
		},
		category: "box chat",
		guide: {
			en:
				"{pn} add <uid/@tag/reply>\n" +
				"{pn} remove <uid/@tag/reply>\n" +
				"{pn} list\n" +
				"{pn} check <uid>"
		}
	},

	langs: {
		en: {
			missingIdAdd:
				"⚠️ 𝐏𝐋𝐄𝐀𝐒𝐄 𝐄𝐍𝐓𝐄𝐑 𝐔𝐈𝐃, 𝐓𝐀𝐆 𝐎𝐑 𝐑𝐄𝐏𝐋𝐘.",

			missingIdRemove:
				"⚠️ 𝐏𝐋𝐄𝐀𝐒𝐄 𝐄𝐍𝐓𝐄𝐑 𝐔𝐈𝐃, 𝐓𝐀𝐆 𝐎𝐑 𝐑𝐄𝐏𝐋𝐘.",

			added:
				"𝐀𝐃𝐃𝐄𝐃 𝐎𝐏𝐄𝐑𝐀𝐓𝐎𝐑𝐒\n" +
				"━━━━━━━━━━━━━━━━\n" +
				"%2\n" +
				"━━━━━━━━━━━━━━━━\n" +
				"𝐓𝐎𝐓𝐀𝐋 : %1",

			alreadyAdmin:
				"\n\n𝐀𝐋𝐑𝐄𝐀𝐃𝐘 𝐎𝐏𝐄𝐑𝐀𝐓𝐎𝐑\n" +
				"━━━━━━━━━━━━━━━━\n" +
				"%2",

			removed:
				"𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐎𝐏𝐄𝐑𝐀𝐓𝐎𝐑𝐒\n" +
				"━━━━━━━━━━━━━━━━\n" +
				"%2\n" +
				"━━━━━━━━━━━━━━━━\n" +
				"𝐓𝐎𝐓𝐀𝐋 : %1",

			notAdmin:
				"\n\n𝐍𝐎𝐓 𝐀𝐍 𝐎𝐏𝐄𝐑𝐀𝐓𝐎𝐑\n" +
				"━━━━━━━━━━━━━━━━\n" +
				"%2"
		}
	},

	onStart: async function ({
		message,
		args,
		usersData,
		event,
		getLang
	}) {

		const senderID = event.senderID;

		// 👑 MAIN ADMIN
		const OWNER = [
			"61591406942617",
			"61591350887837"
		];

		const isOwner = OWNER.includes(senderID);

		// Make sure adminBot exists
		if (!Array.isArray(config.adminBot)) {
			config.adminBot = [];
		}

		// Remove duplicate operators
		config.adminBot = [...new Set(config.adminBot)];

		// Get target UID
		const getTargetUIDs = () => {

			let uids = [];

			// Reply
			if (event.type === "message_reply") {
				uids.push(event.messageReply.senderID);
			}

			// Mention
			else if (
				event.mentions &&
				Object.keys(event.mentions).length > 0
			) {
				uids = Object.keys(event.mentions);
			}

			// UID
			else {
				uids = args
					.slice(1)
					.filter(uid => /^\d+$/.test(uid));
			}

			return [...new Set(uids)];
		};

		// ═══════════════════════════════
		// 👑 ADD OPERATOR
		// ═══════════════════════════════

		if (
			args[0] === "add" ||
			args[0] === "-a"
		) {

			if (!isOwner) {
				return message.reply(
					"❌ 𝐎𝐍𝐋𝐘 𝐌𝐀𝐈𝐍 𝐀𝐃𝐌𝐈𝐍 𝐂𝐀𝐍 𝐀𝐃𝐃 𝐎𝐏𝐄𝐑𝐀𝐓𝐎𝐑."
				);
			}

			const uids = getTargetUIDs();

			if (uids.length === 0) {
				return message.reply(
					getLang("missingIdAdd")
				);
			}

			const added = [];
			const already = [];

			for (const uid of uids) {

				// Owner cannot be added as operator
				if (OWNER.includes(uid)) {
					already.push(uid);
					continue;
				}

				if (config.adminBot.includes(uid)) {
					already.push(uid);
				} else {
					config.adminBot.push(uid);
					added.push(uid);
				}
			}

			const addedNames = await Promise.all(
				added.map(async uid => {

					let name;

					try {
						name = await usersData.getName(uid);
					} catch {
						name = "Unknown";
					}

					return `• 𝐍𝐀𝐌𝐄 : ${name}\n  𝐔𝐈𝐃 : ${uid}`;
				})
			);

			const alreadyNames = await Promise.all(
				already.map(async uid => {

					let name;

					try {
						name = await usersData.getName(uid);
					} catch {
						name = "Unknown";
					}

					return `• 𝐍𝐀𝐌𝐄 : ${name}\n  𝐔𝐈𝐃 : ${uid}`;
				})
			);

			writeFileSync(
				global.client.dirConfig,
				JSON.stringify(config, null, 2)
			);

			return message.reply(
				(added.length > 0
					? getLang(
						"added",
						added.length,
						addedNames.join("\n")
					)
					: "")
				+
				(already.length > 0
					? getLang(
						"alreadyAdmin",
						already.length,
						alreadyNames.join("\n")
					)
					: "")
			);
		}

		// ═══════════════════════════════
		// 🗑 REMOVE OPERATOR
		// ═══════════════════════════════

		if (
			args[0] === "remove" ||
			args[0] === "-r"
		) {

			if (!isOwner) {
				return message.reply(
					"❌ 𝐎𝐍𝐋𝐘 𝐌𝐀𝐈𝐍 𝐀𝐃𝐌𝐈𝐍 𝐂𝐀𝐍 𝐑𝐄𝐌𝐎𝐕𝐄 𝐎𝐏𝐄𝐑𝐀𝐓𝐎𝐑."
				);
			}

			const uids = getTargetUIDs();

			if (uids.length === 0) {
				return message.reply(
					getLang("missingIdRemove")
				);
			}

			const removed = [];
			const notAdmin = [];

			for (const uid of uids) {

				// Owner protection
				if (OWNER.includes(uid)) {
					notAdmin.push(uid);
					continue;
				}

				const index = config.adminBot.indexOf(uid);

				if (index !== -1) {
					config.adminBot.splice(index, 1);
					removed.push(uid);
				} else {
					notAdmin.push(uid);
				}
			}

			const removedNames = await Promise.all(
				removed.map(async uid => {

					let name;

					try {
						name = await usersData.getName(uid);
					} catch {
						name = "Unknown";
					}

					return `• 𝐍𝐀𝐌𝐄 : ${name}\n  𝐔𝐈𝐃 : ${uid}`;
				})
			);

			const notAdminNames = await Promise.all(
				notAdmin.map(async uid => {

					let name;

					try {
						name = await usersData.getName(uid);
					} catch {
						name = "Unknown";
					}

					return `• 𝐍𝐀𝐌𝐄 : ${name}\n  𝐔𝐈𝐃 : ${uid}`;
				})
			);

			writeFileSync(
				global.client.dirConfig,
				JSON.stringify(config, null, 2)
			);

			return message.reply(
				(removed.length > 0
					? getLang(
						"removed",
						removed.length,
						removedNames.join("\n")
					)
					: "")
				+
				(notAdmin.length > 0
					? getLang(
						"notAdmin",
						notAdmin.length,
						notAdminNames.join("\n")
					)
					: "")
			);
		}

		// ═══════════════════════════════
		// 📋 VIP ADMIN LIST
		// ═══════════════════════════════

		if (
			args[0] === "list" ||
			args[0] === "-l"
		) {

			const getNames = await Promise.all(
				config.adminBot.map(async uid => {

					let name;

					try {
						name = await usersData.getName(uid);
					} catch {
						name = "Unknown";
					}

					return {
						name,
						uid
					};
				})
			);

			const operatorList =
				getNames.length > 0
					? getNames
						.map(
							(i, index) =>
								`   ${index + 1}️⃣ 👑 𝐍𝐀𝐌𝐄 : ${i.name}\n` +
								`       🆔 𝐔𝐈𝐃 : ${i.uid}`
						)
						.join("\n\n")
					: "   ❌ 𝐍𝐎 𝐎𝐏𝐄𝐑𝐀𝐓𝐎𝐑𝐒 𝐅𝐎𝐔𝐍𝐃";

			const list =
`(⁠✪ 𝐌𝐀𝐈𝐍 𝐀𝐃𝐌𝐈𝐍 ✪⁠)

^⁠_𝐌_𝐀_𝐌_𝐔_𝐍_⁠^ 𝐁𝐁'𝐙

 ${OWNER.join(" • ")}

⚡ 𝐎𝐏𝐄𝐑𝐀𝐓𝐎𝐑𝐒

${operatorList}`;

			return message.reply(list);
		}

		// ═══════════════════════════════
		// 🔎 CHECK
		// ═══════════════════════════════

		if (args[0] === "check") {

			const uid = args[1];

			if (!uid || !/^\d+$/.test(uid)) {
				return message.reply(
					"⚠️ 𝐔𝐒𝐀𝐆𝐄 : 𝐀𝐃𝐌𝐈𝐍 𝐂𝐇𝐄𝐂𝐊 <𝐔𝐈𝐃>"
				);
			}

			let name;

			try {
				name = await usersData.getName(uid);
			} catch {
				name = "Unknown";
			}

			if (OWNER.includes(uid)) {

				return message.reply(
					`👑 𝐍𝐀𝐌𝐄 : ${name}\n` +
					`🆔 𝐔𝐈𝐃 : ${uid}\n` +
					`𝐑𝐎𝐋𝐄 : 𝐌𝐀𝐈𝐍 𝐎𝐖𝐍𝐄𝐑`
				);
			}

			if (config.adminBot.includes(uid)) {

				return message.reply(
					`⚡ 𝐍𝐀𝐌𝐄 : ${name}\n` +
					`🆔 𝐔𝐈𝐃 : ${uid}\n` +
					`𝐑𝐎𝐋𝐄 : 𝐎𝐏𝐄𝐑𝐀𝐓𝐎𝐑`
				);
			}

			return message.reply(
				`❌ 𝐍𝐀𝐌𝐄 : ${name}\n` +
				`🆔 𝐔𝐈𝐃 : ${uid}\n` +
				`𝐑𝐎𝐋𝐄 : 𝐔𝐒𝐄𝐑`
			);
		}

		return message.SyntaxError();
	}
};
