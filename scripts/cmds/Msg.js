const { getStreamFromURL } = global.utils;

const OWNER_ID = "61594336196895";
const ADMIN_GROUP = "4095426180772827";

module.exports = {
config: {
name: "msg",
version: "5.0",
author: "〲MAMUNツ࿐",
role: 0,
category: "support system"
},

onStart: async function ({ api, args, message, threadsData, event }) {

	if (String(event.senderID) !== OWNER_ID)
		return message.reply("⛔ Only owner can use this command.");

	const content = args.join(" ");
	if (!content)
		return message.reply("❌ Write a message.");

	const allThreads = await threadsData.getAll() || [];
	let success = 0;

	for (const thread of allThreads) {
		const tid = thread.threadID || thread.id || thread.threadId;
		if (!tid) continue;

		try {
			api.sendMessage(

`📢 𝗡𝗢𝗧𝗜𝗙𝗜𝗖𝗔𝗧𝗜𝗢𝗡

${content}

━━━━━━━━━━━━━━
💬 𝗥𝗘𝗣𝗟𝗬 𝗧𝗢 𝗧𝗛𝗜𝗦 𝗠𝗘𝗦𝗦𝗔𝗚𝗘`,
tid,
(err, info) => {
if (!err && info) {
global.GoatBot.onReply.set(info.messageID, {
commandName: "msg",
type: "userReply",
threadID: tid
});
}
}
);

			success++;
		} catch (e) {}
	}

	return message.reply(`✅ Sent to ${success} groups.`);
},

onReply: async function ({ api, event, Reply, usersData }) {

	if (Reply.type === "userReply") {

		let userName = "Unknown User";
		let groupName = "Unknown Group";

		try {
			const user = await usersData.get(event.senderID);
			userName = user?.name || userName;
		} catch {}

		try {
			const info = await api.getThreadInfo(event.threadID);
			groupName = info?.threadName || groupName;
		} catch {}

		const attachments = [];

		if (event.attachments?.length) {
			for (const att of event.attachments) {
				try {
					attachments.push(await getStreamFromURL(att.url));
				} catch {}
			}
		}

		return api.sendMessage(
			{
				body:

`📩 𝗡𝗘𝗪 𝗥𝗘𝗣𝗟𝗬

👤 𝗡𝗔𝗠𝗘 ➤ ${userName}
🆔 𝗨𝗜𝗗 ➤ ${event.senderID}

🏘️ 𝗚𝗥𝗢𝗨𝗣 ➤ ${groupName}
🆔 𝗧𝗜𝗗 ➤ ${event.threadID}

💬 𝗠𝗘𝗦𝗦𝗔𝗚𝗘:
${event.body || "[Attachment]"}`,
attachment: attachments
},
ADMIN_GROUP,
(err, info) => {
if (!err && info) {
global.GoatBot.onReply.set(info.messageID, {
commandName: "msg",
type: "adminReply",
threadID: event.threadID
});
}
}
);
}

	if (Reply.type === "adminReply") {

		const attachments = [];

		if (event.attachments?.length) {
			for (const att of event.attachments) {
				try {
					attachments.push(await getStreamFromURL(att.url));
				} catch {}
			}
		}

		return api.sendMessage(
			{
				body:

`📨 𝗔𝗗𝗠𝗜𝗡 𝗥𝗘𝗣𝗟𝗬

${event.body || ""}

━━━━━━━━━━━━━━
👑 𝗣𝗢𝗪𝗘𝗥𝗘𝗗 𝗕𝗬 𝗠𝗔𝗠𝗨𝗡`,
attachment: attachments
},
Reply.threadID,
(err, info) => {
if (!err && info) {
global.GoatBot.onReply.set(info.messageID, {
commandName: "msg",
type: "userReply",
threadID: Reply.threadID
});
}
}
);
}
}
};
