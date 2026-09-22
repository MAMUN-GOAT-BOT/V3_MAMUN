const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const baseApiUrl = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json");
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "myboy",
                version: "1.7",
                author: "MahMUD",
                role: 0,
                category: "Love",
                countDown: 5,
                description: {
                        bn: "কাউকে আপনার বয় হিসেবে মেনশন করুন",
                        en: "Tag someone to be your boy",
                        vi: "Tag ai đó để làm boy của bạn"
                }
        },

        langs: {
                bn: {
                        noMention: "× অনুগ্রহ করে কাউকে ট্যাগ করুন বা রিপ্লাই দিন",
                        success: "𝐓𝐇𝐀𝐓'𝐒 𝐌𝐀𝐇 𝐁𝐎𝐘 🖤",
                        error: "× API error: %1. Contact MahMUD for help.\n•WhatsApp: 01836298139"
                },
                en: {
                        noMention: "× Please tag or reply to someone",
                        success: "𝐓𝐇𝐀𝐓'𝐒 𝐌𝐀𝐇 𝐁𝐎𝐘 🖤",
                        error: "× API error: %1. Contact MahMUD for help.\n•WhatsApp: 01836298139"
                },
                vi: {
                        noMention: "× Vui lòng tag hoặc trả lời ai đó",
                        success: "ĐÂY LÀ BOY CỦA TÔI 🖤",
                        error: "× Lỗi: %1. Liên hệ MahMUD để hỗ trợ.\n•WhatsApp: 01836298139"
                }
        },

        onStart: async function ({ api, event, message, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                const outputPath = path.join(__dirname, "cache", `myboy_${event.senderID}_${Date.now()}.png`);
                if (!fs.existsSync(path.dirname(outputPath))) fs.mkdirSync(path.dirname(outputPath), { recursive: true });

                try {
                        api.setMessageReaction("❤️", event.messageID, () => {}, true);

                        const mention = Object.keys(event.mentions)[0] || (event.messageReply && event.messageReply.senderID);
                        if (!mention) return message.reply(getLang("noMention"));

                        const apiUrl = await baseApiUrl();
                        const { data } = await axios.get(`${apiUrl}/api/myboy?user1=${mention}&user2=${event.senderID}&style=1`, { 
                                responseType: "arraybuffer" 
                        });

                        fs.writeFileSync(outputPath, Buffer.from(data));

                        return message.reply({
                                body: getLang("success"),
                                attachment: fs.createReadStream(outputPath)
                        }, () => {
                                api.setMessageReaction("✅", event.messageID, () => {}, true);
                                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                        });

                } catch (err) {
                        api.setMessageReaction("❌", event.messageID, () => {}, true);
                        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                        return message.reply(getLang("error", err.message));
                }
        }
};
