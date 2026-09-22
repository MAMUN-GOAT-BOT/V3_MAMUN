const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const API_BASE = "https://hridoy-api.onrender.com";
const FB_TOKEN = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";

module.exports = {
  config: {
    name: "condom",
    version: "3.0",
    author: "HR ID OY",
    countDown: 5,
    role: 0,
    shortDescription: "Funny condom meme",
    category: "Tag Fun",
    guide: { en: "{pn} @mention OR reply" }
  },

  onStart: async function ({ event, message }) {
    try {
      let uid;
      if (Object.keys(event.mentions || {}).length > 0) uid = Object.keys(event.mentions)[0];
      else if (event.messageReply) uid = event.messageReply.senderID;
      else return message.reply("❌ | Mention or reply someone.");

      const file = await buildImage(uid);
      return message.reply({ body: "😂 Ops Crazy Condom Fail!", attachment: fs.createReadStream(file) });
    } catch (err) {
      return message.reply("❌ Failed to create image.");
    }
  }
};

async function buildImage(uid) {
  const cache = path.join(__dirname, "cache");
  await fs.ensureDir(cache);
  const output = path.join(cache, `condom_${uid}_${Date.now()}.png`);

  // ─── API থেকে background config নাও ────────────────
  const cfg = await axios.get(`${API_BASE}/api/images/condom`);
  const bgUrl = cfg.data?.url;
  const facePos = cfg.data?.positions?.face || { x: 256, y: 258, w: 263, h: 263 };

  const avatarURL = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=${FB_TOKEN}`;
  const avatarRes = await axios.get(avatarURL, { responseType: "arraybuffer" });
  const avatarPath = path.join(cache, `av_${uid}.png`);
  fs.writeFileSync(avatarPath, avatarRes.data);

  const canvas = createCanvas(512, 512);
  const ctx = canvas.getContext("2d");
  const bg = await loadImage(bgUrl);
  const avatar = await loadImage(avatarPath);

  ctx.drawImage(bg, 0, 0, 512, 512);

  ctx.save();
  ctx.beginPath();
  ctx.arc(facePos.x + facePos.w / 2, facePos.y + facePos.h / 2, facePos.w / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, facePos.x, facePos.y, facePos.w, facePos.h);
  ctx.restore();

  fs.writeFileSync(output, canvas.toBuffer("image/png"));
  fs.unlinkSync(avatarPath);
  return output;
}
