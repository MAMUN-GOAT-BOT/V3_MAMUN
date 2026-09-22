const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const API_BASE = "https://hridoy-api.onrender.com";

module.exports = {
  config: { name: "xnxx", aliases: ["xn"], version: "2.0", author: "HR ID OY", countDown: 5, role: 0, shortDescription: "XNXX style meme image", category: "Tag Fun", guide: "{pn} tag or reply msg" },
  onStart: async function ({ api, event, args }) {
    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    let uid, name;
    if (event.type === "message_reply") {
      uid = event.messageReply.senderID;
      name = (await api.getUserInfo(uid))[uid].name;
    } else if (Object.keys(event.mentions).length > 0) {
      uid = Object.keys(event.mentions)[0];
      name = event.mentions[uid].replace(/@/g, "");
    } else {
      uid = event.senderID;
      name = (await api.getUserInfo(uid))[uid].name;
    }
    const title = args.join(" ") || name;
    const config = (await axios.get(`${API_BASE}/api/links/xnxx`)).data;
    const avatarUrl = `https://graph.facebook.com/${uid}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    const res = await axios.get(`${config.url}?${config.imageParam}=${encodeURIComponent(avatarUrl)}&${config.titleParam}=${encodeURIComponent(title)}`, { responseType: "arraybuffer" });
    const imgPath = path.join(cacheDir, `xnxx_${uid}.png`);
    fs.writeFileSync(imgPath, Buffer.from(res.data));
    return api.sendMessage({ attachment: fs.createReadStream(imgPath) }, event.threadID,
      () => { if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath); }, event.messageID);
  }
};
