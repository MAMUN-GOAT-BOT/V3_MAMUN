const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const API_BASE = "https://hridoy-api.onrender.com";
module.exports = {
  config: { name: "kill", aliases: ["killed"], version: "2.0", author: "HR ID OY", role: 0, countDown: 5, category: "FUN & SOCIAL", guide: { en: "{pn} @mention | reply | uid" } },
  onStart: async function ({ api, event, message, usersData }) {
    api.setMessageReaction("⏳", event.messageID, () => {}, true);
    const senderID = event.senderID;
    let targetID = event.messageReply?.senderID || Object.keys(event.mentions||{})[0] || event.body?.match(/\b\d{8,20}\b/)?.[0];
    if (!targetID) return message.reply("❌ No target specified.");
    const [nameA, nameB] = await Promise.all([usersData.getName(senderID).catch(()=>"You"), usersData.getName(targetID).catch(()=>"Friend")]);
    const config = (await axios.get(`${API_BASE}/api/images/kill`)).data;
    const token = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";
    const [av1, av2, bg] = await Promise.all([
      loadImage(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=${token}`),
      loadImage(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${token}`),
      loadImage(config.url)
    ]);
    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0);
    const draw = (img, p) => { ctx.save(); ctx.beginPath(); ctx.arc(p.cx, p.cy, p.r, 0, Math.PI*2); ctx.closePath(); ctx.clip(); ctx.drawImage(img, p.cx-p.r, p.cy-p.r, p.r*2, p.r*2); ctx.restore(); };
    draw(av1, config.positions.sender); draw(av2, config.positions.target);
    const cacheDir = path.join(__dirname, "tmp"); await fs.ensureDir(cacheDir);
    const outPath = path.join(cacheDir, `${senderID}_${targetID}.png`);
    fs.writeFileSync(outPath, canvas.toBuffer());
    const body = (config.messages?.[0]||"{sender} is killing {target} 💀").replace("{sender}",nameA).replace("{target}",nameB);
    await message.reply({ body, attachment: fs.createReadStream(outPath) });
    fs.unlinkSync(outPath); api.setMessageReaction("✅", event.messageID, () => {}, true);
  }
};
