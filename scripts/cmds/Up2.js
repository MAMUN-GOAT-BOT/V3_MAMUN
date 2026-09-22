const os = require("os");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

const CACHE_PATH = path.join(__dirname, "cache");

module.exports = {
  config: {
    name: "up2",
    aliases: [],
    version: "2.1",
    author: "MAMUN",
    countDown: 5,
    role: 0,
    shortDescription: "Mamun Bot Dashboard",
    longDescription: "Premium real-time system & performance monitor",
    category: "info",
    guide: "{pn}"
  },

  onStart: async function ({ api, event, message }) {
    const startTime = Date.now();

    try {
      const botUptime = formatUptime(process.uptime());
      const systemUptime = formatUptime(os.uptime());

      const totalMem = os.totalmem() / 1073741824;
      const usedMem = totalMem - os.freemem() / 1073741824;
      const ramPercent = Math.min((usedMem / totalMem) * 100, 100);
      const ramText = `${usedMem.toFixed(2)} GB / ${totalMem.toFixed(2)} GB`;

      const cpuPercent = Math.min((os.loadavg()[0] / os.cpus().length) * 100, 100);
      const platform = `\( {os.platform()} ( \){os.arch()})`;
      const hostname = "railway";
      const nodeVersion = process.version;
      const ping = Date.now() - startTime;

      let botVersion = "3.0";
      let loadedCommands = "N/A";
      try {
        if (global.client && global.client.commands) {
          loadedCommands = global.client.commands.size.toString();
        }
      } catch (e) {}

      const lastRestart = new Date(Date.now() - process.uptime() * 1000).toLocaleString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });

      let userName = "User";
      try {
        const info = await api.getUserInfo(event.senderID);
        userName = info[event.senderID]?.name || "User";
        if (userName.length > 18) userName = userName.substring(0, 17) + "...";
      } catch (e) {}

      const canvas = createCanvas(1000, 620);
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#070b14";
      ctx.fillRect(0, 0, 1000, 620);

      // Outer Border
      ctx.strokeStyle = "#f0a500";
      ctx.lineWidth = 3;
      roundRect(ctx, 8, 8, 984, 604, 20);
      ctx.stroke();

      // ===== LEFT PANEL =====
      ctx.fillStyle = "#0d1526";
      roundRect(ctx, 25, 25, 280, 570, 16);
      ctx.fill();

      // Profile Picture
      try {
        const avatarUrl = `https://graph.facebook.com/${event.senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);

        ctx.save();
        ctx.beginPath();
        ctx.arc(165, 110, 62, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 103, 48, 124, 124);
        ctx.restore();

        ctx.strokeStyle = "#f0a500";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(165, 110, 66, 0, Math.PI * 2);
        ctx.stroke();
      } catch (e) {
        ctx.fillStyle = "#f0a500";
        ctx.beginPath();
        ctx.arc(165, 110, 62, 0, Math.PI * 2);
        ctx.fill();
      }

      // Name
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText(userName, 165, 205);

      // System Owner
      ctx.fillStyle = "#f0a500";
      ctx.font = "bold 14px Arial";
      ctx.fillText("SYSTEM OWNER", 165, 228);

      // Online Badge
      ctx.fillStyle = "#0a2a1a";
      roundRect(ctx, 85, 250, 160, 32, 16);
      ctx.fill();

      ctx.fillStyle = "#00ff88";
      ctx.beginPath();
      ctx.arc(105, 266, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "14px Arial";
      ctx.textAlign = "left";
      ctx.fillText("Server Online", 120, 271);

      // ===== UID + Name Box (QR এর জায়গায়) =====
      ctx.fillStyle = "#111827";
      roundRect(ctx, 50, 310, 230, 140, 12);
      ctx.fill();

      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2;
      roundRect(ctx, 50, 310, 230, 140, 12);
      ctx.stroke();

      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText("USER INFO", 165, 340);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Arial";
      ctx.fillText(userName, 165, 375);

      ctx.fillStyle = "#8a9bb5";
      ctx.font = "13px Arial";
      ctx.fillText("UID", 165, 405);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Arial";
      ctx.fillText(event.senderID, 165, 430);

      // OWNER Box
      ctx.strokeStyle = "#f0a500";
      ctx.lineWidth = 2;
      roundRect(ctx, 50, 480, 230, 50, 10);
      ctx.stroke();

      ctx.fillStyle = "#f0a500";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("OWNER", 165, 500);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 16px Arial";
      ctx.fillText("MAMUN", 165, 520);

      // DEVELOPER Box
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 2;
      roundRect(ctx, 50, 545, 230, 40, 10);
      ctx.stroke();

      ctx.fillStyle = "#00e5ff";
      ctx.font = "bold 12px Arial";
      ctx.fillText("DEVELOPER", 165, 562);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 15px Arial";
      ctx.fillText("MAMUN", 165, 580);

      // ===== RIGHT SIDE =====
      ctx.fillStyle = "#f0a500";
      ctx.font = "bold 28px Arial";
      ctx.textAlign = "left";
      ctx.fillText("◆  MAMUN BOT DASHBOARD", 330, 55);

      ctx.fillStyle = "#8a9bb5";
      ctx.font = "14px Arial";
      ctx.fillText("Real-time system & performance monitor", 330, 78);

      // System Healthy
      ctx.fillStyle = "#0a2a1a";
      roundRect(ctx, 820, 35, 150, 28, 14);
      ctx.fill();
      ctx.fillStyle = "#00ff88";
      ctx.beginPath();
      ctx.arc(838, 49, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "13px Arial";
      ctx.textAlign = "left";
      ctx.fillText("System Healthy", 850, 53);

      // Divider
      ctx.strokeStyle = "rgba(240, 165, 0, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(330, 95);
      ctx.lineTo(970, 95);
      ctx.stroke();

      // Cards
      const cards = [
        { title: "BOT UPTIME", value: botUptime, x: 330, y: 115 },
        { title: "HOSTNAME", value: hostname, x: 660, y: 115 },
        { title: "SYSTEM UPTIME", value: systemUptime, x: 330, y: 200 },
        { title: "PLATFORM", value: platform, x: 660, y: 200 },
        { title: "LATENCY", value: `${ping} ms`, x: 330, y: 285 },
        { title: "BOT VERSION", value: botVersion, x: 660, y: 285 },
        { title: "RAM USAGE", value: ramText, x: 330, y: 370, progress: ramPercent, color: "#f0a500" },
        { title: "LAST RESTART", value: lastRestart, x: 660, y: 370 },
        { title: "CPU LOAD", value: cpuPercent.toFixed(1) + "%", x: 330, y: 470, progress: cpuPercent, color: "#00ff88" },
        { title: "TOTAL THREADS", value: os.cpus().length + "+", x: 660, y: 470 },
        { title: "NODE VERSION", value: nodeVersion, x: 330, y: 555 },
        { title: "LOADED COMMANDS", value: loadedCommands, x: 660, y: 555 }
      ];

      for (const card of cards) {
        ctx.fillStyle = "#111827";
        roundRect(ctx, card.x, card.y, 300, 70, 12);
        ctx.fill();

        ctx.fillStyle = "#00e5ff";
        ctx.font = "bold 13px Arial";
        ctx.textAlign = "left";
        ctx.fillText(card.title, card.x + 18, card.y + 24);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px Arial";
        ctx.fillText(card.value, card.x + 18, card.y + 50);

        if (card.progress !== undefined) {
          ctx.fillStyle = "#1f2937";
          roundRect(ctx, card.x + 18, card.y + 58, 260, 6, 3);
          ctx.fill();

          ctx.fillStyle = card.color;
          const barWidth = Math.max(6, (card.progress / 100) * 260);
          roundRect(ctx, card.x + 18, card.y + 58, barWidth, 6, 3);
          ctx.fill();
        }
      }

      // Generated time
      const now = new Date().toLocaleString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      });
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px Arial";
      ctx.textAlign = "right";
      ctx.fillText(`Generated: ${now}`, 970, 600);

      // Save & Send
      if (!fs.existsSync(CACHE_PATH)) fs.mkdirSync(CACHE_PATH);
      const filePath = path.join(CACHE_PATH, `up2_${event.senderID}.png`);
      await fs.writeFile(filePath, canvas.toBuffer("image/png"));

      await message.reply({
        body: "MAMUN BOT DASHBOARD",
        attachment: fs.createReadStream(filePath)
      });

      setTimeout(() => fs.unlink(filePath).catch(() => {}), 15000);

    } catch (err) {
      console.error(err);
      return message.reply("❌ Dashboard generate করতে সমস্যা হয়েছে।");
    }
  }
};

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
