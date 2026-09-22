const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
 config: {
 name: "neymar",
 version: "2.1",
 author: "〲MAMUNツ࿐",
 countDown: 5,
 role: 0,
 shortDescription: "Random Neymar Video",
 category: "media",
 guide: {
 en: "{pn}"
 }
 },

 onStart: async function ({ message }) {
 try {

 const videos = [
 "https://files.catbox.moe/k77th4.mp4",
 "https://files.catbox.moe/7w3bvu.mp4",
 "https://files.catbox.moe/7ix4nz.mp4",
 "https://files.catbox.moe/oje1cq.mp4",
 "https://files.catbox.moe/nphui1.mp4",
 "https://files.catbox.moe/jho81s.mp4",
 "https://files.catbox.moe/mxzsur.mp4",
 "https://files.catbox.moe/kvpb5f.mp4",
 "https://files.catbox.moe/j27l7g.mp4",
 "https://files.catbox.moe/obv2tx.mp4",
 "https://files.catbox.moe/0cf6xj.mp4",
 "https://files.catbox.moe/xudqoj.mp4",
 "https://files.catbox.moe/e4uata.mp4",
 "https://files.catbox.moe/asfmld.mp4",
 "https://files.catbox.moe/91odp2.mp4"
 ];

 const randomVideo =
 videos[Math.floor(Math.random() * videos.length)];

 const cachePath = path.join(__dirname, "cache");

 if (!fs.existsSync(cachePath)) {
 fs.mkdirSync(cachePath, { recursive: true });
 }

 const filePath = path.join(cachePath, "neymar.mp4");

 const response = await axios({
 url: randomVideo,
 method: "GET",
 responseType: "stream",
 timeout: 30000,

 headers: {
 "User-Agent": "Mozilla/5.0"
 }
 });

 const writer = fs.createWriteStream(filePath);

 response.data.pipe(writer);

 writer.on("finish", async () => {
 await message.reply({
 body: `
𝙉𝙀𝙔𝙈𝘼𝙍 𝙅𝙍
 `,
 attachment: fs.createReadStream(filePath)
 });

 if (fs.existsSync(filePath)) {
 fs.unlinkSync(filePath);
 }
 });

 writer.on("error", async () => {
 await message.reply("❌ Video write failed!");
 });

 } catch (err) {

 if (err.response?.status == 429) {
 return message.reply("⚠️ Server busy! Try again later.");
 }

 console.log(err);

 return message.reply("❌ Video load failed!");
 }
 }
};
