const fs = require("fs-extra");
const axios = require("axios");
const { loadImage, createCanvas } = require("canvas");
const path = require("path");

const BASE_IMAGE_URL = "https://i.ibb.co.com/QFNnJQ69/Messenger-creation-B72-EABA8-49-BD-4-F41-8894-70-A9-CD12-EF23.jpg";

const FACE_X = 368;
const FACE_Y = 78;
const FACE_RW = 52;
const FACE_RH = 54;

module.exports = {
  config: {
    name: "pussy",
    version: "1.0.0",
    author: "EryXenX",
    countDown: 5,
    role: 2,
    description: {
      en: "Put someone's face on the image",
      bn: "কারো মুখ ইমেজে বসাও",
      hi: "Kisi ka chehra image mein lagao",
      tl: "Ilagay ang mukha ng isa sa larawan",
      ar: "ضع وجه شخص على الصورة"
    },
    category: "fun",
    guide: { en: "{pn} @mention" }
  },

  langs: {
    en: {
      noMention: "❌ | Mention someone!",
      error: "❌ | Failed to generate image. Try again."
    },
    bn: {
      noMention: "❌ | কাউকে mention করুন!",
      error: "❌ | ইমেজ তৈরি করতে সমস্যা হয়েছে।"
    },
    hi: {
      noMention: "❌ | Kisi ko mention karein!",
      error: "❌ | Image banana fail hua. Dobara try karein."
    },
    tl: {
      noMention: "❌ | Mag-mention ng isa!",
      error: "❌ | Hindi nagawa ang larawan. Subukan muli."
    },
    ar: {
      noMention: "❌ | أشر إلى شخص ما!",
      error: "❌ | فشل إنشاء الصورة. حاول مرة أخرى."
    }
  },

  onStart: async function ({ event, message, getLang }) {
    try {
      const mentionID =
        Object.keys(event.mentions || {})[0] ||
        (event.messageReply ? event.messageReply.senderID : null);

      if (!mentionID) return message.reply(getLang("noMention"));

      const ts = Date.now();
      const cacheDir = path.join(__dirname, "cache");
      fs.ensureDirSync(cacheDir);

      const basePath   = path.join(cacheDir, `p_base_${ts}.jpg`);
      const avatarPath = path.join(cacheDir, `p_avt_${ts}.jpg`);
      const outputPath = path.join(cacheDir, `p_out_${ts}.jpg`);

      const [baseRes, avatarRes] = await Promise.all([
        axios.get(BASE_IMAGE_URL, { responseType: "arraybuffer" }),
        axios.get(
          `https://graph.facebook.com/${mentionID}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
          { responseType: "arraybuffer" }
        )
      ]);

      fs.writeFileSync(basePath, Buffer.from(baseRes.data));
      fs.writeFileSync(avatarPath, Buffer.from(avatarRes.data));

      const baseImg   = await loadImage(basePath);
      const avatarImg = await loadImage(avatarPath);

      const canvas = createCanvas(baseImg.width, baseImg.height);
      const ctx    = canvas.getContext("2d");

      ctx.drawImage(baseImg, 0, 0, baseImg.width, baseImg.height);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(FACE_X, FACE_Y, FACE_RW, FACE_RH, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        avatarImg,
        FACE_X - FACE_RW,
        FACE_Y - FACE_RH,
        FACE_RW * 2,
        FACE_RH * 2
      );
      ctx.restore();

      fs.writeFileSync(outputPath, canvas.toBuffer("image/jpeg", { quality: 0.95 }));

      await message.reply({
        body: "",
        attachment: fs.createReadStream(outputPath)
      });

      [basePath, avatarPath, outputPath].forEach(p => {
        try { fs.unlinkSync(p); } catch (_) {}
      });

    } catch (err) {
      console.error("P Command Error:", err);
      message.reply(getLang("error"));
    }
  }
};
