const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.onrender.com";
module.exports = {
  config: { name: "sanda", version: "2.0", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "Expose someone as sanda", category: "Tag Fun", guide: { en: "{pn} @mention or reply" } },
  onStart: async function ({ event, message, api }) {
    let targetID = Object.keys(event.mentions || {})[0] || (event.type === "message_reply" ? event.messageReply?.senderID : null);
    if (!targetID) return message.reply("❗ Tag or reply to someone!");
    if (targetID === event.senderID) return message.reply("❗ নিজেকেই sanda বানাবি? 😂");
    const config = (await axios.get(`${API_BASE}/api/images/sanda`)).data;
    const avatarUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const [bgBuffer, avatarBuffer] = await Promise.all([
      axios.get(config.url, { responseType: "arraybuffer" }).then(r => r.data),
      axios.get(avatarUrl, { responseType: "arraybuffer" }).then(r => r.data)
    ]);
    const bg = await loadImage(bgBuffer);
    const avatar = await loadImage(avatarBuffer);
    const canvas = createCanvas(config.canvasSize.w, config.canvasSize.h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0, config.canvasSize.w, config.canvasSize.h);
    const pos = config.positions.face;
    const cx = pos.x + pos.w/2, cy = pos.y + pos.h/2, r = pos.w/2;
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.closePath(); ctx.clip();
    ctx.drawImage(avatar, pos.x, pos.y, pos.w, pos.h); ctx.restore();
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const outputPath = path.join(cacheDir, `sanda_${targetID}.png`);
    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
    const userInfo = await api.getUserInfo(targetID);
    const name = userInfo[targetID]?.name || "User";
    const body = (config.messages?.[0] || "🤣 {name} এখন official Sanda! 🦥").replace("{name}", name);
    return message.reply({ body, attachment: fs.createReadStream(outputPath) },
      () => { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); });
  }
};
