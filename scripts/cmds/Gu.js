const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");

module.exports = {
 config: {
 name: "gu",
 version: "1.0",
 author: "EryXenX",
 countDown: 5,
 role: 0,
 description: "Give gu to someone",
 category: "fun",
 guide: {
 en: "{pn} @mention or reply to a message"
 }
 },

 onStart: async function ({ api, event, message }) {
 const { threadID, messageID, senderID, mentions, messageReply } = event;

 let targetID;
 if (messageReply) {
 targetID = messageReply.senderID;
 } else if (mentions && Object.keys(mentions).length > 0) {
 targetID = Object.keys(mentions)[0];
 } else {
 return message.reply("Please mention someone or reply to a message.");
 }

 if (targetID === senderID) {
 return message.reply("You can't give gu to yourself.");
 }

 const senderAvatarUrl = `https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
 const targetAvatarUrl = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

 try {
 const [senderRes, targetRes] = await Promise.all([
 axios.get(senderAvatarUrl, { responseType: "arraybuffer" }),
 axios.get(targetAvatarUrl, { responseType: "arraybuffer" })
 ]);

 const senderBuffer = Buffer.from(senderRes.data, "binary");
 const targetBuffer = Buffer.from(targetRes.data, "binary");

 const background = await loadImage("https://i.ibb.co/9H7tCrVj/1921441846a4.jpg");
 const senderImg = await loadImage(senderBuffer);
 const targetImg = await loadImage(targetBuffer);

 const canvas = createCanvas(background.width, background.height);
 const ctx = canvas.getContext("2d");

 ctx.drawImage(background, 0, 0, background.width, background.height);

 function drawCircleAvatar(image, x, y, radius) {
 ctx.save();
 ctx.beginPath();
 ctx.arc(x, y, radius, 0, Math.PI * 2, true);
 ctx.closePath();
 ctx.clip();
 ctx.drawImage(image, x - radius, y - radius, radius * 2, radius * 2);
 ctx.restore();
 ctx.beginPath();
 ctx.arc(x, y, radius, 0, Math.PI * 2, true);
 ctx.lineWidth = 8;
 ctx.strokeStyle = "#000000";
 ctx.stroke();
 }

 const rightX = background.width * 0.685;
 const rightY = background.height * 0.345;
 const rightR = background.width * 0.175;

 const leftX = background.width * 0.255;
 const leftY = background.height * 0.62;
 const leftR = background.width * 0.155;

 drawCircleAvatar(senderImg, rightX, rightY, rightR);
 drawCircleAvatar(targetImg, leftX, leftY, leftR);

 const fs = require("fs-extra");
 await fs.ensureDir(`${__dirname}/cache`);
 const filePath = `${__dirname}/cache/gu_${senderID}_${targetID}.png`;
 const out = fs.createWriteStream(filePath);
 const stream = canvas.createPNGStream();
 stream.pipe(out);

 out.on("finish", () => {
 message.reply(
 {
 attachment: fs.createReadStream(filePath)
 },
 () => fs.unlinkSync(filePath)
 );
 });
 } catch (err) {
 console.log(err);
 message.reply("Something went wrong while generating the image.");
 }
 }
};
