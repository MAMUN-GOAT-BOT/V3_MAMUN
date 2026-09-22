const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const API_BASE = "https://hridoy-api.onrender.com";
const CMD_NAME = "goru2";

module.exports = {
  config: {
    name: "goru2", version: "2.0", author: "HR ID OY", countDown: 5, role: 0,
    category: "Tag Fun", shortDescription: { en: "Funny Cow meme" }, guide: { en: "{pn} @mention or reply" }
  },
  onStart: async function ({ api, event, message }) {
    const { threadID, messageID, senderID, mentions, messageReply } = event;
    let targetID = Object.keys(mentions || {})[0] || messageReply?.senderID;
    if (!targetID) return message.reply("আরে বলদ 😒 মেনশন বা রিপ্লাই কর তারপর গরু বানাবি 🐄");
    const userInfo = await api.getUserInfo(targetID);
    const userName = userInfo?.[targetID]?.name || "User";
    const config = (await axios.get(`${API_BASE}/api/images/${CMD_NAME}`)).data;
    const token = "6628568379|c1e620fa708a1d5696fb991c1bde5662";
    const [base, senderPfp, targetPfp] = await Promise.all([
      loadImage(config.url),
      loadImage(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=${token}`),
      loadImage(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${token}`)
    ]);
    const canvas = createCanvas(base.width, base.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(base, 0, 0);
    const draw = (img, pos) => {
      ctx.save(); ctx.beginPath();
      ctx.arc(pos.x + pos.w/2, pos.y + pos.h/2, pos.w/2, 0, Math.PI*2);
      ctx.clip(); ctx.drawImage(img, pos.x, pos.y, pos.w, pos.h); ctx.restore();
    };
    draw(senderPfp, config.positions.sender);
    draw(targetPfp, config.positions.target);
    const cacheDir = path.join(process.cwd(), "cache");
    await fs.ensureDir(cacheDir);
    const filePath = path.join(cacheDir, `goru_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
    const body = (config.messages?.[0] || "এই নে তোর গরুর ছবি! 🐄\n\n{target}, এখন ঘাস খাওয়াইতে নিয়া যা 😂").replace("{target}", userName);
    return api.sendMessage({ body, attachment: fs.createReadStream(filePath) }, threadID,
      () => fs.existsSync(filePath) && fs.unlinkSync(filePath), messageID);
  }
};
