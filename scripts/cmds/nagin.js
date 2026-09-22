const fs = require("fs-extra");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const API_BASE = "https://hridoy-api.onrender.com";
module.exports = {
  config: { name: "nagin", version: "2.0", author: "HR ID OY", countDown: 5, role: 0, category: "Tag Fun", guide: { en: "{pn} @mention" } },
  onStart: async function ({ event, message }) {
    const mentionID = Object.keys(event.mentions)[0] || event.messageReply?.senderID;
    if (!mentionID) return message.reply("❌ | Mention someone!");
    const config = (await axios.get(`${API_BASE}/api/images/nagin`)).data;
    const ts = Date.now();
    const basePath = __dirname + `/cache/nagin_base_${ts}.jpg`;
    const avatarPath = __dirname + `/cache/nagin_avt_${ts}.jpg`;
    const outputPath = __dirname + `/cache/nagin_out_${ts}.jpg`;
    await fs.ensureDir(__dirname + "/cache");
    const [baseRes, avatarRes] = await Promise.all([
      axios.get(config.url, { responseType: "arraybuffer" }),
      axios.get(`https://graph.facebook.com/${mentionID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`, { responseType: "arraybuffer" })
    ]);
    fs.writeFileSync(basePath, Buffer.from(baseRes.data));
    fs.writeFileSync(avatarPath, Buffer.from(avatarRes.data));
    const baseImg = await loadImage(basePath);
    const avatarImg = await loadImage(avatarPath);
    const canvas = createCanvas(baseImg.width, baseImg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImg, 0, 0, baseImg.width, baseImg.height);
    const pos = config.positions.face;
    ctx.save(); ctx.beginPath();
    ctx.ellipse(pos.cx, pos.cy, pos.rw, pos.rh, 0, 0, Math.PI * 2);
    ctx.clip(); ctx.drawImage(avatarImg, pos.cx - pos.rw, pos.cy - pos.rh, pos.rw * 2, pos.rh * 2); ctx.restore();
    fs.writeFileSync(outputPath, canvas.toBuffer("image/jpeg", { quality: 0.92 }));
    await message.reply({ body: config.messages?.[0] || "", attachment: fs.createReadStream(outputPath) });
    [basePath, avatarPath, outputPath].forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
  }
};
