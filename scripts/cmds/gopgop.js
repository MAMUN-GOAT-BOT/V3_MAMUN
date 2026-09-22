const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const HRIDOY_API = "https://hridoy-api.onrender.com";
const IMAGE_NAME = "gopgop";

module.exports = {
  config: {
    name: "gopgop",
    aliases: ["gop", "gok","gokgok"],
    version: "4.0.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    category: "Tag Fun",
    shortDescription: "দুইজনের profile pic একসাথে দেখাও",
    longDescription: "Reply বা mention করো — তুমি আর সে একই frame এ!",
    guide: "{pn} [reply/mention]"
  },

  onStart: async function ({ api, event, message, usersData }) {
    const cache = path.join(__dirname, "cache");
    await fs.ensureDir(cache);

    const ts = Date.now();
    const outputPath   = path.join(cache, `ship_out_${ts}.jpg`);
    const templatePath = path.join(cache, `ship_tpl_${ts}.jpg`);
    const senderAvPath = path.join(cache, `ship_s_${ts}.jpg`);
    const targetAvPath = path.join(cache, `ship_t_${ts}.jpg`);

    try {
      let templateUrl, senderPos, targetPos, msgTemplates;

      try {
        const cfgRes = await axios.get(
          `${HRIDOY_API}/api/images/${IMAGE_NAME}`,
          { timeout: 10000, headers: { "Accept": "application/json" } }
        );

        const cfg = cfgRes.data;
        if (!cfg.success || !cfg.url) {
          return message.reply(`❌ API তে "${IMAGE_NAME}" config পাওয়া যায়নি!`);
        }

        templateUrl  = cfg.url;
        senderPos    = cfg.positions?.sender;
        targetPos    = cfg.positions?.target;
        msgTemplates = cfg.messages || [];

        if (!senderPos || !targetPos) {
          return message.reply("❌ API তে position config নেই!");
        }

      } catch (e) {
        return message.reply("❌ API থেকে config নেওয়া যায়নি!\nError: " + e.message);
      }
      
      const senderID = event.senderID;
      let targetID = null;

      if (event.messageReply?.senderID) targetID = event.messageReply.senderID;

      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      }

      if (!targetID) {
        return message.reply(
          "❌ কাউকে reply বা mention করো!\n" +
          "Example: !ship @name অথবা কারো message এ reply করে !ship"
        );
      }

      if (targetID === senderID) {
        return message.reply("❌ নিজেকে নিজে ship করা যাবে না! 😂");
      }

      async function getAvatar(userID) {
        try {
          if (usersData && typeof usersData.getAvatarUrl === "function") {
            const url = await usersData.getAvatarUrl(userID);
            if (url) return url;
          }
        } catch (e) {}
        try {
          const info = await api.getUserInfo(userID);
          if (info?.[userID]) return info[userID].avatarUrl || info[userID].profileUrl || null;
        } catch (e) {}
        return null;
      }

      const [senderAvatarURL, targetAvatarURL] = await Promise.all([
        getAvatar(senderID),
        getAvatar(targetID)
      ]);

      if (!senderAvatarURL) return message.reply("❌ তোমার profile picture পাওয়া যায়নি!");
      if (!targetAvatarURL) return message.reply("❌ তার profile picture পাওয়া যায়নি!");

      
      async function getName(userID) {
        try {
          const info = await api.getUserInfo(userID);
          return info?.[userID]?.name || "সে";
        } catch (e) { return "সে"; }
      }

      const [senderName, targetName] = await Promise.all([
        getName(senderID),
        getName(targetID)
      ]);
      
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      };

      const [templateRes, senderRes, targetRes] = await Promise.all([
        axios.get(templateUrl,       { responseType: "arraybuffer", timeout: 30000, headers }),
        axios.get(senderAvatarURL,   { responseType: "arraybuffer", timeout: 30000, headers }),
        axios.get(targetAvatarURL,   { responseType: "arraybuffer", timeout: 30000, headers })
      ]);

      await Promise.all([
        fs.writeFile(templatePath, templateRes.data),
        fs.writeFile(senderAvPath, senderRes.data),
        fs.writeFile(targetAvPath, targetRes.data)
      ]);

      const templateImg = await loadImage(templatePath);
      const senderImg   = await loadImage(senderAvPath);
      const targetImg   = await loadImage(targetAvPath);

      const canvas = createCanvas(templateImg.width, templateImg.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);

      function drawCircleAvatar(img, pos) {
        const { x, y, w, h } = pos;
        const size = Math.min(img.width, img.height);
        const cropX = (img.width - size) / 2;
        const cropY = (img.height - size) / 2;

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, cropX, cropY, size, size, x, y, w, h);
        ctx.restore();
      }

      drawCircleAvatar(senderImg, senderPos);
      drawCircleAvatar(targetImg, targetPos);

      await fs.writeFile(outputPath, canvas.toBuffer("image/jpeg", { quality: 0.95 }));

      const rawMsg = msgTemplates[Math.floor(Math.random() * msgTemplates.length)]
        || "😂 {sender} আর {target} একই frame এ! 💀";

      // {sender} ও {target} placeholder replace করো
      const bodyText = rawMsg
        .replace(/\{sender\}/g, senderName)
        .replace(/\{target\}/g, targetName);

      await message.reply({
        body: bodyText,
        attachment: fs.createReadStream(outputPath)
      });

      setTimeout(async () => {
        try {
          await fs.remove(outputPath);
          await fs.remove(templatePath);
          await fs.remove(senderAvPath);
          await fs.remove(targetAvPath);
        } catch (e) {}
      }, 30000);

    } catch (error) {
      console.error("[SHIP] Error:", error);
      try {
        await fs.remove(outputPath);
        await fs.remove(templatePath);
        await fs.remove(senderAvPath);
        await fs.remove(targetAvPath);
      } catch (e) {}
      return message.reply("❌ Image বানানো যায়নি!\nError: " + error.message);
    }
  }
};