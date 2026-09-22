const fs = require("fs-extra");
const Canvas = require("canvas");
const path = require("path");
const axios = require("axios");
const API_BASE = "https://hridoy-api.onrender.com";
module.exports = {
  config: { name: "kidnap", aliases: ["kdnp"], version: "2.0", author: "HR ID OY", role: 0, countDown: 5, shortDescription: "Make a kidnap-style image", category: "Tag Fun", guide: { en: "{pn} @mention | reply" } },
  onStart: async function ({ api, event, message, usersData }) {
    api.setMessageReaction("🕜", event.messageID, () => {}, true);
    const senderID = event.senderID;
    let targetID = event.messageReply?.senderID || Object.keys(event.mentions || {})[0];
    if (!targetID) return message.reply("❌ মেনশন বা রিপ্লাই দাও");
    const name1 = await usersData.getName(senderID).catch(() => "You");
    const name2 = await usersData.getName(targetID).catch(() => "Friend");
    const config = (await axios.get(`${API_BASE}/api/images/kidnap`)).data;
    const token = "350685531728|62f8ce9f74b12f84c123cc23437a4a32";
    const [img1, img2, bgImg] = await Promise.all([
      Canvas.loadImage(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=${token}`),
      Canvas.loadImage(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${token}`),
      Canvas.loadImage(config.url)
    ]);
    const canvas = Canvas.createCanvas(bgImg.width, bgImg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bgImg, 0, 0);
    const draw = (img, pos) => {
      ctx.save(); ctx.beginPath(); ctx.arc(pos.cx, pos.cy, pos.r, 0, Math.PI*2); ctx.closePath(); ctx.clip();
      ctx.drawImage(img, pos.cx-pos.r, pos.cy-pos.r, pos.r*2, pos.r*2); ctx.restore();
    };
    draw(img1, config.positions.sender); draw(img2, config.positions.target);
    const file = path.join(__dirname, "tmp", `${senderID}_${targetID}.png`);
    await fs.ensureDir(path.dirname(file));
    fs.writeFileSync(file, canvas.toBuffer());
    const body = (config.messages?.[0] || "{sender} кι∂ηαρρє∂ {target} 👺").replace("{sender}", name1).replace("{target}", name2);
    message.reply({ body, attachment: fs.createReadStream(file) }, () => { fs.unlinkSync(file); api.setMessageReaction("✅", event.messageID, () => {}, true); });
  }
};
