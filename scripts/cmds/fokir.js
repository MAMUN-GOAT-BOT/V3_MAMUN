const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const API_BASE = "https://hridoy-api.onrender.com";
const CMD_NAME = "fokir";
const ORIGINAL_AUTHOR = "HR ID OY";

function verifyAuthor(configAuthor) {
  return configAuthor === ORIGINAL_AUTHOR;
}

module.exports = {
  config: {
    name: "fokir",
    version: "2.3.0",
    author: ORIGINAL_AUTHOR, // 🔒 LOCKED
    countDown: 5,
    role: 0,
    category: "Tag Fun",
    description: "Fokir street meme edit 😂",
    guide: "{pn} @mention or reply"
  },

  onStart: async function ({ api, event, message }) {

    // 🔒 ANTI-EDIT CHECK
    if (!verifyAuthor(this.config.author)) {
      return message.reply("❌ This file has been modified illegally. Author mismatch detected!");
    }

    const { threadID, messageID, mentions, messageReply } = event;

    const cacheDir = path.join(process.cwd(), "cache");
    if (!fs.existsSync(cacheDir)) fs.ensureDirSync(cacheDir);

    // ── Target user ID বের করা ──
    let targetID = null;
    if (mentions && Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (messageReply && messageReply.senderID) {
      targetID = messageReply.senderID;
    }

    if (!targetID) {
      return message.reply("আরে মামা, কাউরে মেনশন দে বা রিপ্লাই দে! 🪙😂");
    }

    try {
      // ── Step 1: API থেকে config নেওয়া ──
      const configRes = await fetch(`${API_BASE}/api/images/${CMD_NAME}`);
      if (!configRes.ok) throw new Error(`API config পাওয়া যায়নি (${configRes.status})`);
      const config = await configRes.json();

      const bgURL    = config.url;
      const pos      = config.positions.face;   // { x, y, w, h }
      const border   = config.border || null;   // { color, width }
      const messages = config.messages || [];

      // ── Step 2: User info ও profile pic ──
      const userInfo = await api.getUserInfo(targetID);
      const userName = userInfo[targetID]?.name || "User";

      const accessToken = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
      const targetPfpUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${accessToken}`;

      // ── Step 3: Image load ──
      const [baseImage, targetPfp] = await Promise.all([
        loadImage(bgURL),
        loadImage(targetPfpUrl)
      ]);

      // ── Step 4: Canvas তৈরি ──
      const canvas = createCanvas(baseImage.width, baseImage.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

      // ── Step 5: Circular face আঁকা (API এর x,y,w,h দিয়ে) ──
      const cx = pos.x + pos.w / 2;
      const cy = pos.y + pos.h / 2;
      const r  = pos.w / 2;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(targetPfp, pos.x, pos.y, pos.w, pos.h);
      ctx.restore();

      // ── Step 6: Border আঁকা (API config থেকে) ──
      if (border) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = border.width || 3;
        ctx.strokeStyle = border.color || "#ffffff";
        ctx.stroke();
      }

      // ── Step 7: Image save ──
      const filePath = path.join(cacheDir, `fokir_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer("image/png"));

      // ── Step 8: Message তৈরি (API messages থেকে) ──
      let finalCaption = `🪙 নতুন ফকির হাজির! 😂\n\n👤 ${userName}\n💰 আজকের আয়: ০ টাকা 😭`;
      if (messages.length > 0) {
        const raw = messages[Math.floor(Math.random() * messages.length)];
        finalCaption = raw.replace(/\{name\}/g, userName);
      }

      // ── Step 9: Reply ──
      return api.sendMessage({
        body: finalCaption,
        mentions: [{ tag: userName, id: targetID }],
        attachment: fs.createReadStream(filePath)
      }, threadID, () => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }, messageID);

    } catch (e) {
      console.error("FOKIR ERROR:", e);
      return message.reply("মামা ফকিরটা পালাইছে! আবার ট্রাই কর ❌");
    }
  }
};