const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "xdi",
    version: "1.0",
    author: "EryXenX",
    countDown: 5,
    role: 0,
    shortDescription: "Doge comparison meme",
    longDescription: "Generates a doge meme: sender's avatar on top, replied/mentioned user's avatar on bottom",
    category: "fun",
    guide: {
      en: "{pn} reply to someone's message or mention them\nExample: {pn} @Someone"
    }
  },

  onStart: async function ({ api, event, usersData, message }) {
    const { threadID, messageID, senderID, type, messageReply, mentions } = event;

    let targetID;

    if (type === "message_reply") {
      targetID = messageReply.senderID;
    } else if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    }

    if (!targetID) {
      return message.reply(
        "Please reply to someone's message or mention them to use this command."
      );
    }

    if (targetID === senderID) {
      return message.reply("You can't use this command on yourself.");
    }

    try {
      const templateUrl = "https://i.ibb.co/7tmNvRXX/c7eb9a6feaab.jpg";

      const avatarSenderUrl = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
      const avatarTargetUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

      const [template, avatarTop, avatarBottom] = await Promise.all([
        loadImage(templateUrl),
        loadImage(avatarSenderUrl),
        loadImage(avatarTargetUrl)
      ]);

      const canvas = createCanvas(480, 480);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(template, 0, 0, 480, 480);

      const drawAvatarInCircle = (img, cx, cy, radius) => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          img,
          cx - radius,
          cy - radius,
          radius * 2,
          radius * 2
        );
        ctx.restore();
      };

      // Top circle: command sender
      drawAvatarInCircle(avatarTop, 140, 60, 62);

      // Bottom circle: replied/mentioned target
      drawAvatarInCircle(avatarBottom, 108, 425, 48);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath = path.join(cacheDir, `xdi_${senderID}.png`);
      await fs.writeFile(filePath, canvas.toBuffer("image/png"));

      await message.reply({
        body: "",
        attachment: fs.createReadStream(filePath)
      });

      fs.unlink(filePath, () => {});
    } catch (err) {
      console.error(err);
      return message.reply("Failed to generate the image. Please try again.");
    }
  }
};
