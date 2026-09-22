const axios = require("axios");
const fs = require("fs");
const path = require("path");

const baseApiUrl = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "trigger",
                aliases: ["triggered"],
                version: "1.0",
                author: "MahMUD",
                countDown: 10,
                role: 0,
                description: {
                        bn: "কারো ছবিতে ট্রিগারড ইফেক্ট যুক্ত করুন",
                        en: "Add a triggered effect to someone's profile picture"
                },
                category: "Tag Fun",
                guide: {
                        bn: '   {pn} <@tag>: কাউকে ট্যাগ করে ট্রিগারড বানান'
                                + '\n   {pn} <uid>: UID দিয়ে ছবি তৈরি করুন'
                                + '\n   (অথবা কারো মেসেজে রিপ্লাই দিয়ে এটি ব্যবহার করুন)',
                        en: '   {pn} <@tag>: Create a triggered effect for someone'
                                + '\n   {pn} <uid>: Create using UID'
                                + '\n   (Or reply to someone\'s message)'
                }
        },

        langs: {
                bn: {
                        noTarget: "× বেবি, কাকে ট্রিগারড বানাবে তাকে মেনশন দাও, রিপ্লাই করো অথবা UID দাও! ⚡",
                        success: "Effect trigger successful ⚡",
                        error: "× ছবি তৈরি করতে সমস্যা হয়েছে: %1। প্রয়োজনে Contact Kakashi।"
                },
                en: {
                        noTarget: "× Baby, mention, reply, or provide UID of the target! ⚡",
                        success: "Effect trigger successful ⚡",
                        error: "× Failed to create image: %1. Contact Kakashi for help."
                }
        },

        onStart: async function ({ api, message, args, event, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                const { mentions, messageReply } = event;
                let id2;

                if (messageReply) {
                        id2 = messageReply.senderID;
                } else if (Object.keys(mentions).length > 0) {
                        id2 = Object.keys(mentions)[0];
                } else if (args[0] && !isNaN(args[0])) {
                        id2 = args[0];
                }

                if (!id2) return message.reply(getLang("noTarget"));

                const cacheDir = path.join(__dirname, "cache");
                const filePath = path.join(cacheDir, `trigger_${id2}.png`);

                try {
                        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

                        const baseUrl = await baseApiUrl();
                        const url = `${baseUrl}/api/dig?type=trigger&user=${id2}`;

                        const response = await axios.get(url, { responseType: "arraybuffer" });
                        fs.writeFileSync(filePath, Buffer.from(response.data));

                        await message.reply({
                                body: getLang("success"),
                                attachment: fs.createReadStream(filePath)
                        });

                        setTimeout(() => {
                                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        }, 5000);

                } catch (err) {
                        console.error("Trigger command error:", err);
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        return message.reply(getLang("error", err.message));
                }
        }
};
