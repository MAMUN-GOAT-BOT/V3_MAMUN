const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.onrender.com";
module.exports = {
  config: { name: "gorib", aliases: ["poor"], version: "2.0", author: "HR ID OY", countDown: 5, role: 0, category: "FUN & SOCIAL", guide: { en: "{pn} @mention / reply" } },
  onStart: async function ({ api, event, args }) {
    const { threadID, messageID, mentions, type, messageReply, senderID } = event;
    api.setMessageReaction("⏳", messageID, () => {}, true);
    let targetID = type==="message_reply" ? messageReply.senderID : Object.keys(mentions)[0] || (args[0]&&!isNaN(args[0])?args[0]:senderID);
    const config = (await axios.get(`${API_BASE}/api/images/gorib`)).data;
    const userInfo = await api.getUserInfo(targetID), name = userInfo[targetID].name;
    const [goribImg, avatarImg] = await Promise.all([
      loadImage(config.url),
      loadImage(`https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`)
    ]);
    const canvas = createCanvas(goribImg.width, goribImg.height), ctx = canvas.getContext("2d");
    ctx.drawImage(goribImg, 0, 0, canvas.width, canvas.height);
    const pos = config.positions.face;
    ctx.save(); ctx.beginPath(); ctx.arc(pos.x+pos.w/2, pos.y+pos.h/2, pos.w/2, 0, Math.PI*2, true); ctx.closePath(); ctx.clip(); ctx.drawImage(avatarImg, pos.x, pos.y, pos.w, pos.h); ctx.restore();
    const pathImg = path.join(__dirname, "cache", `gorib_${targetID}.png`); await fs.ensureDir(path.dirname(pathImg));
    fs.writeFileSync(pathImg, canvas.toBuffer());
    api.setMessageReaction("✅", messageID, () => {}, true);
    const body = (config.messages?.[0]||"{name}, তোর এই অবস্থা কেনো? এই নে দুই টাকা💸😭").replace("{name}",name);
    return api.sendMessage({ body, attachment: fs.createReadStream(pathImg) }, threadID, () => { if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg); }, messageID);
  }
};
