const axios = require("axios");
const fs = require("fs");
const path = require("path");

const mahmud = async () => {
  const base = await axios.get(
    "https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json"
  );
  return base.data.mahmud;
};

module.exports = {
  config: {
		shortDescription: "Kicked (Tag Fun)", // auto-added: was missing, caused blank entry in help
		guide: "{pn}", // auto-added: was missing, caused blank usage in help
    name: "kicked",
    aliases: ["lathi"],
    version: "2.0",
    author: "MahMUD",
    countDown: 5,
    role: 0,
    category: "Tag Fun"
  },

  onStart: async function ({ api, event, message }) {
    let targetID;

    // ---------------- MENTION ----------------
    const mentions = Object.keys(event.mentions || {});
    if (mentions.length > 0) {
      targetID = mentions[0];
    }

    // ---------------- REPLY ----------------
    else if (event.type === "message_reply" && event.messageReply) {
      targetID = event.messageReply.senderID;
    }

    // ---------------- NO TARGET ----------------
    if (!targetID) {
      return message.reply("❌ Please mention or reply to someone!");
    }

    const senderID = event.senderID;

    const imgPath = path.join(
      __dirname,
      "cache",
      `kicked_${senderID}_${targetID}.png`
    );

    if (!fs.existsSync(path.dirname(imgPath))) {
      fs.mkdirSync(path.dirname(imgPath), { recursive: true });
    }

    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const base = await mahmud();

      const response = await axios.post(
        `${base}/api/kicked`,
        { senderID, targetID },
        { responseType: "arraybuffer" }
      );

      fs.writeFileSync(imgPath, Buffer.from(response.data));

      // ---------------- CUSTOM BODY MESSAGE ----------------
      const bodyMsg = `👢 BOOM! KICKED! 💥\n\n👉 <@${targetID}> just got kicked by a savage move 😆🔥`;

      return message.reply(
        {
          body: bodyMsg,
          attachment: fs.createReadStream(imgPath)
        },
        () => {
          api.setMessageReaction("✅", event.messageID, () => {}, true);
          if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
      );

    } catch (err) {
      console.error("KICK ERROR:", err);

      api.setMessageReaction("❌", event.messageID, () => {}, true);

      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

      return message.reply("❌ Failed to generate kicked image.");
    }
  }
};