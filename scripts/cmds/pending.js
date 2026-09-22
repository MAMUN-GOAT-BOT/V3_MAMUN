const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "pending",
    version: "3.0",
    author: "〲MAMUNⓇ︵爱",
    countDown: 5,
    role: 2,
    shortDescription: {
      en: "Manage pending group requests"
    },
    longDescription: {
      en: "Approve or refuse groups waiting for bot permission"
    },
    category: "owner"
  },

  langs: {
    en: {
      invalid: "❌ 𝗜𝗻𝘃𝗮𝗹𝗶𝗱 𝘀𝗲𝗹𝗲𝗰𝘁𝗶𝗼𝗻: %1",

      refused:
        "🚫 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱\n📦 𝗚𝗿𝗼𝘂𝗽𝘀: %1\n⏰ 𝗧𝗶𝗺𝗲: %2",

      approved:
        "✅ 𝗥𝗲𝗾𝘂𝗲𝘀𝘁 𝗔𝗽𝗽𝗿𝗼𝘃𝗲𝗱\n📦 𝗚𝗿𝗼𝘂𝗽𝘀: %1\n⏰ 𝗧𝗶𝗺𝗲: %2",

      fetchFail:
        "❌ 𝗨𝗻𝗮𝗯𝗹𝗲 𝘁𝗼 𝗹𝗼𝗮𝗱 𝗽𝗲𝗻𝗱𝗶𝗻𝗴 𝗴𝗿𝗼𝘂𝗽𝘀",

      empty:
        "✅ 𝗡𝗼 𝗽𝗲𝗻𝗱𝗶𝗻𝗴 𝗴𝗿𝗼𝘂𝗽𝘀 𝗳𝗼𝘂𝗻𝗱",

      list:
`
   𝗣𝗘𝗡𝗗𝗜𝗡𝗚


📦 𝗧𝗼𝘁𝗮𝗹 𝗥𝗲𝗾𝘂𝗲𝘀𝘁𝘀 : %1

%2
`
    }
  },

  onReply: async ({ api, event, Reply, getLang }) => {
    if (event.senderID != Reply.author)
      return;

    const input = event.body.trim();
    const { threadID, messageID } = event;

    const prefix =
      global.GoatBot?.config?.prefix || "-";

    const botNickname =
      "𝗧𝗠 ^〲𝗠𝗔𝗠𝗨𝗡ツ࿐ ⁰⁰⁷";

    let done = 0;

    const dateTime = moment()
      .tz("Asia/Dhaka")
      .format("DD/MM/YYYY • hh:mm:ss A");

    if (/^(c|cancel)/i.test(input)) {
      const nums = input
        .replace(/^(c|cancel)/i, "")
        .trim()
        .split(/\s+/);

      for (const n of nums) {
        if (
          !Number(n) ||
          n < 1 ||
          n > Reply.queue.length
        )
          return api.sendMessage(
            getLang("invalid", n),
            threadID,
            messageID
          );

        const targetThreadID =
          Reply.queue[n - 1].threadID;

        api.sendMessage(
`
   𝗔𝗖𝗖𝗘𝗦𝗦 𝗗𝗘𝗡𝗜𝗘𝗗 


╭╮

➤ 𝗦𝘁𝗮𝘁𝘂𝘀 : 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱 ❌
➤ 𝗣𝗿𝗲𝗳𝗶𝘅 : ${prefix}
➤ 𝗧𝗶𝗺𝗲 : ${dateTime}

━━━━━━━━━━━━━━━━━━
 𝗣𝗲𝗿𝗺𝗶𝘀𝘀𝗶𝗼𝗻 𝗡𝗼𝘁 𝗚𝗿𝗮𝗻𝘁𝗲𝗱
 𝗕𝗼𝘁 𝗜𝘀 𝗟𝗲𝗮𝘃𝗶𝗻𝗴...
━━━━━━━━━━━━━━━━━━`,
          targetThreadID
        );

        try {
          await api.removeUserFromGroup(
            api.getCurrentUserID(),
            targetThreadID
          );
        }
        catch (e) {
          console.log(e);
        }

        done++;
      }

      return api.sendMessage(
        getLang("refused", done, dateTime),
        threadID,
        messageID
      );
    }

    const nums = input.split(/\s+/);

    for (const n of nums) {
      if (
        !Number(n) ||
        n < 1 ||
        n > Reply.queue.length
      )
        return api.sendMessage(
          getLang("invalid", n),
          threadID,
          messageID
        );

      const targetThreadID =
        Reply.queue[n - 1].threadID;

      const botID =
        api.getCurrentUserID();

      api.sendMessage(
`
╭╮
𝗕𝗢𝗧 𝗔𝗖𝗧𝗜𝗩𝗔𝗧𝗘𝗗
╰╯

➤ 𝗦𝘁𝗮𝘁𝘂𝘀 : 𝗢𝗻𝗹𝗶𝗻𝗲 🟢
➤ 𝗣𝗿𝗲𝗳𝗶𝘅 : ${prefix}
➤ 𝗧𝗶𝗺𝗲 : ${dateTime}
`,
        targetThreadID
      );

      try {
        await api.changeNickname(
          botNickname,
          targetThreadID,
          botID
        );
      }
      catch (e) {
        console.log(e);
      }

      done++;
    }

    return api.sendMessage(
      getLang("approved", done, dateTime),
      threadID,
      messageID
    );
  },

  onStart: async ({
    api,
    event,
    getLang,
    commandName
  }) => {
    const {
      threadID,
      messageID,
      senderID
    } = event;

    try {
      const other =
        await api.getThreadList(
          100,
          null,
          ["OTHER"]
        ) || [];

      const pending =
        await api.getThreadList(
          100,
          null,
          ["PENDING"]
        ) || [];

      const groups = [
        ...other,
        ...pending
      ].filter(
        t =>
          t.isGroup &&
          t.isSubscribed
      );

      if (!groups.length)
        return api.sendMessage(
          getLang("empty"),
          threadID,
          messageID
        );

      let text = "";

      groups.forEach(
        (group, index) => {
          text += `${index + 1}. ${group.name || "Unnamed Group"}\n🆔 ${group.threadID}\n\n`;
        }
      );

      api.sendMessage(
        getLang(
          "list",
          groups.length,
          text
        ),
        threadID,
        (err, info) => {
          global.GoatBot.onReply.set(
            info.messageID,
            {
              commandName,
              author: senderID,
              queue: groups
            }
          );
        },
        messageID
      );
    }
    catch (err) {
      api.sendMessage(
        getLang("fetchFail"),
        threadID,
        messageID
      );
    }
  }
};
