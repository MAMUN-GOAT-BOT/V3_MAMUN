const A = require("axios");
const F = require("fs");
const P = require("path");

const J = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

module.exports = {
  config: {
    name: "vuda",
    version: "1.0.0",
    author: "ArYAN",
    countDown: 5,
    role: 0,
    category: "nsfw"
  },

  onStart: async function ({ api: a, event: e }) {
    const { threadID: t, messageID: m } = e;
    a.setMessageReaction("⏳", m, () => {}, true);

    try {
      const r = await A.get(J);
      const b = r.data.api;

      const c = P.join(__dirname, "cache", `p_${Date.now()}.png`);
      const d = P.join(__dirname, "cache");
      if (!F.existsSync(d)) F.mkdirSync(d);

      const s = await A.get(`${b}/pussy`, { responseType: "arraybuffer" });
      F.writeFileSync(c, Buffer.from(s.data));

      a.setMessageReaction("✅", m, () => {}, true);

      await a.sendMessage({
        body: "your pussy image 🥵",
        attachment: F.createReadStream(c)
      }, t, () => F.unlinkSync(c), m);

    } catch (err) {
      a.setMessageReaction("❌", m, () => {}, true);
      return a.sendMessage("• Failed to fetch image.", t, m);
    }
  }
};
