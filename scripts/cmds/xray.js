const fs = require("fs-extra");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");

const API_BASE = "https://hridoy-api.onrender.com";

module.exports = {
  config: {
    name: "xray",
    version: "2.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Show someone's xray",
    category: "Tag Fun",
    guide: "{pn} @mention or reply"
  },

  langs: {
    en: { noMention: "❌ | Mention someone or reply!", error: "❌ | Failed to generate." }
  },

  onStart: async function ({ event, message, getLang }) {
    try {
      const mentionID = Object.keys(event.mentions)[0] || (event.messageReply ? event.messageReply.senderID : null);
      if (!mentionID) return message.reply(getLang("noMention"));

      // Get xray template config from api.json
      const cfg = await axios.get(`${API_BASE}/api/images/xray`);
      const { url: XRAY_URL, positions } = cfg.data;
      const pos = positions.face;

      const ts = Date.now();
      const basePath = __dirname + "/cache/xray_base_" + ts + ".jpg";
      const avatarPath = __dirname + "/cache/xray_avt_" + ts + ".jpg";
      const outputPath = __dirname + "/cache/xray_out_" + ts + ".jpg";

      await fs.ensureDir(__dirname + "/cache");

      const [baseRes, avatarRes] = await Promise.all([
        axios.get(XRAY_URL, { responseType: "arraybuffer" }),
        axios.get(`https://graph.facebook.com/${mentionID}/picture?height=1000&width=1000&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" })
      ]);

      fs.writeFileSync(basePath, Buffer.from(baseRes.data));
      fs.writeFileSync(avatarPath, Buffer.from(avatarRes.data));

      const baseImg = await loadImage(basePath);
      const avatarImg = await loadImage(avatarPath);
      const { width: W, height: H } = baseImg;

      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(baseImg, 0, 0, W, H);

      ctx.save();
      ctx.beginPath();
      ctx.rect(pos.x, pos.y, pos.w, pos.h);
      ctx.clip();
      ctx.drawImage(avatarImg, pos.x, pos.y, pos.w, pos.h);
      ctx.restore();

      fs.writeFileSync(outputPath, canvas.toBuffer("image/jpeg", { quality: 0.92 }));
      await message.reply({ body: "", attachment: fs.createReadStream(outputPath) });

      [basePath, avatarPath, outputPath].forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });

    } catch (err) {
      message.reply(getLang("error"));
    }
  }
};
