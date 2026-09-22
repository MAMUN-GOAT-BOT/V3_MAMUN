const axios = require('axios');
const fs = require("fs");
const path = require("path");

const baseApiUrl = async () => {
  const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
  return base.data.mahmud;
};

/**
* @author MahMUD
* @author: do not delete it
*/

module.exports = {
  config: {
		shortDescription: "Mistake (Tag Fun)", // auto-added: was missing, caused blank entry in help
		role: 0, // auto-added: was missing
    name: "mistake",
    version: "1.7",
    author: "MahMUD",
    countDown: 10,
    category: "Tag Fun",
    guide: "{pn} (mention/uid/reply)"
  },

  onStart: async function ({ message, event, args }) {
     const obfuscatedAuthor = String.fromCharCode(77, 97, 104, 77, 85, 68); 
     if (module.exports.config.author !== obfuscatedAuthor) {
     return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
     }
    
    const { senderID, messageReply, mentions } = event;
    let uid;

    if (messageReply) uid = messageReply.senderID;
    else if (Object.keys(mentions).length > 0) uid = Object.keys(mentions)[0];
    else if (args[0]) uid = args[0];
    else uid = senderID;

    try {
      const apiUrl = await baseApiUrl();
      const finalImageURL = `${apiUrl}/api/mistake?uid=${uid}`;
      const imgPath = path.join(__dirname, 'tmp', `${uid}_mistake.png`);

      if (!fs.existsSync(path.join(__dirname, 'tmp'))) fs.mkdirSync(path.join(__dirname, 'tmp'));
      const response = await axios.get(finalImageURL, { responseType: 'arraybuffer' });
      fs.writeFileSync(imgPath, Buffer.from(response.data));

      await message.reply({
        body: "• 𝐓𝐡𝐞 𝐁𝐢𝐠𝐠𝐞𝐬𝐭 𝐌𝐢𝐬𝐭𝐚𝐤𝐞 𝐨𝐧 𝐄𝐚𝐫𝐭𝐡 <🌍",
        attachment: fs.createReadStream(imgPath)
      }, () => {
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      });

    } catch (error) {
      console.log(error);
      return message.reply("API Error! Could not generate image, contact Kakashi.");
    }
  }
};
