const os = require("os");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

// Global Cache
let cachedBackground = null;
const CACHE_PATH = path.join(__dirname, "cache");

module.exports = {
  config: {
    name: "up3",
    version: "2.2",
    author: "𝗧𝗠 ^〲𝗠𝗔𝗠𝗨𝗡ツ࿐ ⁰⁰⁷",
    countDown: 5,
    role: 0,
    shortDescription: "MAMUN BOT DASHBOARD",
    longDescription: "MAMUN BOT DASHBOARD - Clean glass style with profile & big uptime",
    category: "info",
    guide: "{pn}"
  },

  onStart: async function ({ api, event, message }) {
    const startTime = Date.now();

    try {
      // ===== System Stats =====
      const uptimeSec = process.uptime();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const ramPercent = ((usedMem / totalMem) * 100).toFixed(0);

      const cpuLoad = ((os.loadavg()[0] / os.cpus().length) * 100);
      const cpuPercent = Math.min(100, Math.max(0, cpuLoad)).toFixed(0);

      // Simple disk estimate (not 100% accurate without extra modules)
      let diskPercent = 65;
      try {
        const stats = fs.statfsSync("/");
        const total = stats.blocks * stats.bsize;
        const free = stats.bfree * stats.bsize;
        diskPercent = (((total - free) / total) * 100).toFixed(0);
      } catch (e) {}

      const platform = os.platform();
      const botUptime = formatUptime(uptimeSec);
      const ping = Date.now() - startTime;

      // ===== User Name =====
      let userName = "User";
      try {
        const info = await api.getUserInfo(event.senderID);
        userName = info[event.senderID]?.name || "User";
        if (userName.length > 13) userName = userName.substring(0, 12) + "...";
      } catch (e) {}

      // ===== Canvas =====
      const canvas = createCanvas(920, 540);
      const ctx = canvas.getContext("2d");

      // Background
      if (!cachedBackground) {
        try {
          cachedBackground = await loadImage("https://i.imgur.com/3lHp7W0.jpeg");
        } catch (e) {
          cachedBackground = null;
        }
      }

      if (cachedBackground) {
        ctx.drawImage(cachedBackground, 0, 0, 920, 540);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 920, 540);
        grad.addColorStop(0, "#020b12");
        grad.addColorStop(1, "#041820");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 920, 540);
      }

      // Dark overlay
      ctx.fillStyle = "rgba(2, 10, 18, 0.85)";
      ctx.fillRect(0, 0, 920, 540);

      // Soft outer border
      ctx.strokeStyle = "rgba(0, 229, 255, 0.22)";
      ctx.lineWidth = 10;
      roundRect(ctx, 8, 8, 904, 524, 22);
      ctx.stroke();

      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2;
      roundRect(ctx, 14, 14, 892, 512, 18);
      ctx.stroke();

      // ===== Title =====
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 20;
      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 38px Arial";
      ctx.textAlign = "center";
      ctx.fillText("MAMUN BOT DASHBOARD", 460, 58);
      ctx.shadowBlur = 0;

      // ===== LEFT PANEL =====
      ctx.fillStyle = "rgba(6, 18, 30, 0.82)";
      roundRect(ctx, 32, 85, 255, 420, 18);
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 229, 255, 0.3)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, 32, 85, 255, 420, 18);
      ctx.stroke();

      // Profile Picture
      try {
        const avatarUrl = `https://graph.facebook.com/${event.senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);

        ctx.save();
        ctx.beginPath();
        ctx.arc(159, 145, 48, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 111, 97, 96, 96);
        ctx.restore();

        // Soft glow ring
        ctx.strokeStyle = "rgba(0, 229, 255, 0.5)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(159, 145, 51, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(159, 145, 49, 0, Math.PI * 2);
        ctx.stroke();
      } catch (e) {
        ctx.fillStyle = "#00e5ff";
        ctx.beginPath();
        ctx.arc(159, 145, 48, 0, Math.PI * 2);
        ctx.fill();
      }

      // Name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px Arial";
      ctx.textAlign = "center";
      ctx.fillText(userName, 159, 215);

      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 11px Arial";
      ctx.fillText("SYSTEM CONTROLLER", 159, 233);

      // Online status
      ctx.fillStyle = "#00ff9d";
      ctx.beginPath();
      ctx.arc(128, 255, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d0f5ff";
      ctx.font = "12px Arial";
      ctx.textAlign = "left";
      ctx.fillText("Server Online", 140, 259);

      // SYSTEM INFO title
      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 15px Arial";
      ctx.textAlign = "left";
      ctx.fillText("SYSTEM INFO", 50, 295);

      // Stats
      ctx.font = "14px Arial";
      ctx.fillStyle = "#c8f0ff";
      ctx.fillText(`CPU  : ${cpuPercent}%`, 50, 325);
      ctx.fillText(`RAM  : ${ramPercent}%`, 50, 350);
      ctx.fillText(`DISK : ${diskPercent}%`, 50, 375);
      ctx.fillText(`OS   : ${platform}`, 50, 400);

      // ===== BIG UPTIME =====
      ctx.fillStyle = "#00ff9d";
      ctx.font = "bold 15px Arial";
      ctx.fillText("UPTIME", 50, 440);

      ctx.shadowColor = "#00ff9d";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.fillText(botUptime, 50, 475);
      ctx.shadowBlur = 0;

      // PING
      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 14px Arial";
      ctx.fillText(`PING: ${ping}MS`, 50, 505);

      // ===== RIGHT SIDE Progress Bars =====
      drawProgressBar(ctx, 315, 100, 560, 75, "CPU USAGE", cpuPercent, "#00e5ff");
      drawProgressBar(ctx, 315, 200, 560, 75, "RAM USAGE", ramPercent, "#ff4dc4");
      drawProgressBar(ctx, 315, 300, 560, 75, "DISK USAGE", diskPercent, "#4da6ff");

      // Bottom text
      ctx.shadowColor = "#00ff9d";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#00ff9d";
      ctx.font = "bold 22px Arial";
      ctx.textAlign = "center";
      ctx.fillText("SERVER RUNNING SMOOTH", 595, 430);
      ctx.shadowBlur = 0;

      // Developer box
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      roundRect(ctx, 380, 460, 430, 40, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 229, 255, 0.45)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, 380, 460, 430, 40, 12);
      ctx.stroke();

      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("DEVELOPER  •  MAMUN", 595, 485);

      // ===== Save & Send =====
      if (!fs.existsSync(CACHE_PATH)) fs.mkdirSync(CACHE_PATH);

      const filePath = path.join(CACHE_PATH, `uptime_${event.senderID}.png`);
      const buffer = canvas.toBuffer("image/png");
      await fs.writeFile(filePath, buffer);

      await message.reply({
        body: "MAMUN BOT DASHBOARD",
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => {
        fs.unlink(filePath).catch(() => {});
      }, 12000);

    } catch (err) {
      console.error("Uptime Error:", err);
      return message.reply("❌ Dashboard generate করতে সমস্যা হয়েছে।");
    }
  }
};

// ===== Progress Bar =====
function drawProgressBar(ctx, x, y, w, h, label, value, color) {
  // Glass background
  ctx.fillStyle = "rgba(8, 22, 35, 0.7)";
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();

  ctx.strokeStyle = "rgba(0, 229, 255, 0.22)";
  ctx.lineWidth = 1.2;
  roundRect(ctx, x, y, w, h, 14);
  ctx.stroke();

  // Label
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  ctx.textAlign = "left";
  ctx.fillText(label, x + 20, y + 26);

  // Track
  const barX = x + 20;
  const barY = y + 42;
  const barW = w - 110;
  const barH = 18;

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  roundRect(ctx, barX, barY, barW, barH, 9);
  ctx.fill();

  // Fill
  const fillW = Math.max(10, (barW * value) / 100);

  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  roundRect(ctx, barX, barY, fillW, barH, 9);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Value
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "right";
  ctx.fillText(`${value}%`, x + w - 20, y + 56);
}

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}
