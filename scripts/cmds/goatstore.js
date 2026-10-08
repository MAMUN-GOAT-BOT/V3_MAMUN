"use strict";

const fs     = require("fs");
const path   = require("path");
const axios  = require("axios");
const crypto = require("crypto");

const LOCAL_CFG = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(process.cwd(), "goatstore_config.json"), "utf8")); }
  catch (_) { return {}; }
})();

const CONFIG = {

  API_URL: "https://hridoy-api.vercel.app",

  ADMIN_USER: process.env.GOATSTORE_ADMIN_USER || LOCAL_CFG.ADMIN_USER || "",
  ADMIN_PASS: process.env.GOATSTORE_ADMIN_PASS || LOCAL_CFG.ADMIN_PASS || "",

  UPDATE_CHECK_INTERVAL: 1000 * 60 * 30,

  PASTEBIN_API_KEY: process.env.GOATSTORE_PASTEBIN_KEY || LOCAL_CFG.PASTEBIN_API_KEY || "",

  AUTO_SYNC: true,

  AUTO_SYNC_INTERVAL: 1000 * 60 * 60,

  AUTO_SYNC_WATCH: true,

  CATEGORIES: ["economy", "fun", "moderation", "games", "utility", "ai"],

  MAX_EDITS_PER_MESSAGE: 5,
};

const RESERVED_NAMES = ["goatstore", "autosync"];
const GS_PATH = "/api/gs";
function gsApi(p) { return `${CONFIG.API_URL}${GS_PATH}${p}`; }

const SYNC_CACHE_PATH = path.join(process.cwd(), "goatstore_sync_cache.json");
const DIR_CACHE_PATH  = path.join(process.cwd(), "goatstore_dircache.json");

const userSeenNoti      = new Map();
let   _updateCheckCache = null;
let   _autoupdateInFlight = false;

function isAllowed(senderID) {
  const adminUIDs = global.GoatBot?.config?.adminBot;
  if (!Array.isArray(adminUIDs)) return false;
  return adminUIDs.map(String).includes(String(senderID));
}

function getPrefix(threadData) {
  try {
    if (threadData?.data?.prefix) return threadData.data.prefix;
    if (global.GoatBot?.config?.prefix) return global.GoatBot.config.prefix;
  } catch (_) {}
  return "!";
}

function loadJson(filePath, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return fallback; }
}

function saveJson(filePath, data) {
  try { fs.writeFileSync(filePath, JSON.stringify(data, null, 2)); }
  catch (_) {}
}

const EVENTS_PATTERNS = ["events", "event"];
const SKIP_DIRS       = new Set(["node_modules", ".git", ".cache", "dist", "build"]);

let _dirCache = loadJson(DIR_CACHE_PATH, {});

function scanForDir(startDir, patterns, maxDepth = 2) {
  const queue = [{ dir: startDir, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch (_) { continue; }
    for (const ent of entries) {
      if (!ent.isDirectory() || SKIP_DIRS.has(ent.name) || ent.name.startsWith(".")) continue;
      const full  = path.join(dir, ent.name);
      if (patterns.includes(ent.name.toLowerCase())) return full;
      if (depth < maxDepth) queue.push({ dir: full, depth: depth + 1 });
    }
  }
  return null;
}

function getCmdsDir(forceRescan = false) {
  if (!forceRescan && _dirCache.cmdsDir && fs.existsSync(_dirCache.cmdsDir))
    return _dirCache.cmdsDir;
  const dir = __dirname;
  _dirCache.cmdsDir = dir;
  saveJson(DIR_CACHE_PATH, _dirCache);
  return dir;
}

function getEventsDir(forceRescan = false) {
  if (!forceRescan && _dirCache.eventsDir && fs.existsSync(_dirCache.eventsDir))
    return _dirCache.eventsDir;
  const parent = path.dirname(getCmdsDir(forceRescan));
  const dir    = scanForDir(parent, EVENTS_PATTERNS, 2) || path.join(parent, "events");
  _dirCache.eventsDir = dir;
  saveJson(DIR_CACHE_PATH, _dirCache);
  return dir;
}

function parseVer(v) { return String(v).split(".").map(n => parseInt(n) || 0); }
function cmpVer(a, b) {
  const pa = parseVer(a), pb = parseVer(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function hashContent(content) {
  return crypto.createHash("sha1").update(String(content)).digest("hex");
}

function detectFramework(code) {
  const isGoat =
    /module\.exports\s*=\s*\{/.test(code) &&
    /onStart\s*[:(]|onChat\s*[:(]|onLoad\s*[:(]/.test(code) &&
    /\bauthor\s*:/.test(code);
  return isGoat ? "goat" : "other";
}

function extractMeta(code, fallbackName = "unknown", preferLongDesc = false) {
  const cfgIdx = code.search(/\bconfig\s*[:=]\s*\{/);
  const scoped = cfgIdx >= 0 ? code.slice(cfgIdx, cfgIdx + 6000) : code;
  const pick = (key) => {
    const rx = new RegExp(
      String.raw`(?:^|[\s,{"'])` + key + String.raw`["']?\s*:\s*(["'\x60])((?:\\.|(?!\1)[^\\\n])*)\1`, "m");
    return (scoped.match(rx) || code.match(rx) || [])[2];
  };
  const rawCat = String(pick("category") || "utility").trim().toLowerCase();
  return {
    name:        (pick("name") || fallbackName).trim(),
    author:      (pick("author") || "Unknown").trim(),
    version:     (pick("version") || "1.0.0").trim(),
    category:    rawCat,
    description: ((preferLongDesc && pick("longDescription")) || pick("shortDescription") || pick("longDescription") || "No description").trim(),
  };
}

function adminHeaders() {
  return {
    "Content-Type": "application/json",
    "user": CONFIG.ADMIN_USER,
    "pass": CONFIG.ADMIN_PASS,
  };
}

// The backend accepts EITHER the short sequential number (seq: 1, 2, 3...)
// OR the long Mongo _id for every command/event lookup, install, delete,
// like and rawlink call. The short number is what users can actually type
// reliably, so show that everywhere instead of the long hex _id.
function displayId(cmd) {
  if (cmd?.seq != null) return String(cmd.seq);
  return cmd?._id || cmd?.id || "N/A";
}

async function apiSearch(q = "", category = "", limit = 0, kind = "", author = "") {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (author && !q) params.set("author", author);
  if (category && category !== "all") params.set("category", category);
  if (kind) params.set("kind", kind);
  if (limit) params.set("limit", limit);
  const res = await axios.get(gsApi(`/commands?${params.toString()}`));
  return Array.isArray(res.data) ? res.data : [];
}

async function apiTrending(limit = 10) {
  const res = await axios.get(gsApi(`/commands/trending?limit=${limit}`));
  const data = Array.isArray(res.data) ? res.data : [];
  return data.slice(0, limit);
}

function cleanId(id) { return encodeURIComponent(String(id).trim().replace(/^#/, "")); }

async function apiGetOne(id) {
  let res;
  try {
    res = await axios.get(gsApi(`/commands/${cleanId(id)}`), { timeout: 15000, validateStatus: () => true });
  } catch (err) {
    const e = new Error(err.code === "ECONNABORTED" ? "Request timed out." : (err.message || "Network error."));
    e.status = 0;
    throw e;
  }
  if (res.status === 404) return null;
  if (res.status >= 400) {
    const apiMsg = (res.data && typeof res.data === "object" && res.data.error) || `Store API returned HTTP ${res.status}`;
    const e = new Error(apiMsg);
    e.status = res.status;
    throw e;
  }
  const d = res.data;
  return d && typeof d === "object" && !Array.isArray(d) ? d : null;
}

async function apiUpload({ name, category, description, author, code, kind, version }) {
  const headers = { "Content-Type": "application/json" };

  if (RESERVED_NAMES.includes(String(name).toLowerCase()) && CONFIG.ADMIN_USER && CONFIG.ADMIN_PASS) {
    headers.user = CONFIG.ADMIN_USER;
    headers.pass = CONFIG.ADMIN_PASS;
  }
  const res = await axios.post(
    gsApi(`/commands`),
    { name, category, description, author, code, kind, version },
    { headers, timeout: 30000, validateStatus: () => true }
  );
  const data = res.data && typeof res.data === "object" ? res.data : {};
  const out  = { ...data, _status: res.status, _created: res.status === 201, _duplicate: res.status === 409 && data._duplicate === true };
  if (res.status >= 400 && !out.error) out.error = `Store API returned HTTP ${res.status}`;
  return out;
}

async function apiLike(id, visitorId) {
  const res = await axios.post(
    gsApi(`/commands/${cleanId(id)}/like`),
    { visitor_id: visitorId },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data;
}

async function apiDelete(id) {
  const res = await axios.delete(
    gsApi(`/commands/${cleanId(id)}`),
    { headers: adminHeaders() }
  );
  return res.data;
}

async function uploadToPastebin(code, pasteName = "GoatBot Command") {
  if (!CONFIG.PASTEBIN_API_KEY) return null;
  try {
    const params = new URLSearchParams();
    params.set("api_dev_key",       CONFIG.PASTEBIN_API_KEY);
    params.set("api_option",        "paste");
    params.set("api_paste_code",    code);
    params.set("api_paste_name",    pasteName);
    params.set("api_paste_format",  "javascript");
    params.set("api_paste_expire_date", "N");
    params.set("api_paste_private", "0");

    const res = await axios.post(
      "https://pastebin.com/api/api_post.php",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 10000 }
    );

    const pasteUrl = (res.data || "").trim();
    if (!pasteUrl.startsWith("https://pastebin.com/")) return null;

    const pasteKey = pasteUrl.replace("https://pastebin.com/", "");
    return `https://pastebin.com/raw/${pasteKey}`;
  } catch (_) {
    return null;
  }
}

async function apiCountInstall(id) {
  try { await axios.post(gsApi(`/commands/${cleanId(id)}/install`), {}, { timeout: 8000 }); }
  catch (_) {}
}

async function apiRawLink(id) {
  try {
    const res = await axios.post(gsApi(`/commands/${cleanId(id)}/rawlink`), {}, { timeout: 20000 });
    const u = res.data?.url;
    return typeof u === "string" && u.startsWith("http") ? u : null;
  } catch (_) { return null; }
}

async function getRawLink(cmd) {
  if (cmd.pastebin_url) return cmd.pastebin_url;
  const id = cmd._id || cmd.id;
  let url = id ? await apiRawLink(id) : null;
  if (!url && cmd.code && CONFIG.PASTEBIN_API_KEY) {
    url = await uploadToPastebin(cmd.code, cmd.name || "GoatBot Command");
    if (url && id) await apiSetPastebin(id, url);
  }
  return url;
}

async function apiSetPastebin(id, rawUrl) {
  try {
    await axios.patch(
      gsApi(`/commands/${cleanId(id)}/pastebin`),
      { url: rawUrl },
      { headers: adminHeaders() }
    );
  } catch (_) {}
}

let _visitorId = null;
function getVisitorId() {
  if (_visitorId) return _visitorId;
  const cachePath = path.join(process.cwd(), "goatstore_visitor.json");
  const cache     = loadJson(cachePath, {});
  if (cache.id) { _visitorId = cache.id; return _visitorId; }
  _visitorId = `bot_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  saveJson(cachePath, { id: _visitorId });
  return _visitorId;
}

const FRAMES   = ["◖", "◕", "◔", "◓", "◒", "◑", "◐"];
const buildBar = (pct) =>
  "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));

async function animateInstall(api, threadID, name) {
  const steps = [
    { label: "Downloading source",   pct: 30,  delay: 600 },
    { label: "Verifying integrity",  pct: 60,  delay: 900 },
    { label: "Writing to disk",      pct: 85,  delay: 700 },
    { label: "Registering command",  pct: 100, delay: 600 },
  ];
  const info = await api.sendMessage(
    `📦 Installing ${name}...\n\n◖ Fetching package info...\n[░░░░░░░░░░] 0%`,
    threadID
  );
  for (let i = 0; i < steps.length; i++) {
    await new Promise(r => setTimeout(r, steps[i].delay));
    await api.editMessage(
      `📦 Installing ${name}...\n\n${FRAMES[i]} ${steps[i].label}...\n[${buildBar(steps[i].pct)}] ${steps[i].pct}%`,
      info.messageID
    );
  }
  return info.messageID;
}

async function animateUpload(api, threadID, name) {
  const steps = [
    { label: "Reading file",              pct: 30,  delay: 500 },
    { label: "Uploading to store",        pct: 70,  delay: 900 },
    { label: "Finalizing registration",   pct: 100, delay: 500 },
  ];
  const info = await api.sendMessage(
    `📤 Uploading ${name}...\n\n◖ Preparing upload...\n[░░░░░░░░░░] 0%`,
    threadID
  );
  for (let i = 0; i < steps.length; i++) {
    await new Promise(r => setTimeout(r, steps[i].delay));
    await api.editMessage(
      `📤 Uploading ${name}...\n\n${FRAMES[i]} ${steps[i].label}...\n[${buildBar(steps[i].pct)}] ${steps[i].pct}%`,
      info.messageID
    );
  }
  return info.messageID;
}

function autoloadCommand(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    const cmd = require(filePath);
    if (cmd?.config?.name) {
      const name = cmd.config.name.toLowerCase();
      global.GoatBot.commands.set(name, cmd);
      if (Array.isArray(cmd.config.aliases))
        cmd.config.aliases.forEach(a => global.GoatBot.commands.set(a.toLowerCase(), cmd));
      if (typeof cmd.onLoad === "function") cmd.onLoad({});
      return { success: true, name };
    }
    return { success: false, reason: "Missing config.name." };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

const CAT_ICONS = {
  economy: "💰", fun: "🎉", moderation: "🛡️",
  games: "🎮", utility: "🔧", ai: "✨",
};
function catBadge(cmd) {
  const icon = CAT_ICONS[cmd.category] || "📦";
  return `${icon} ${cmd.category || "uncategorized"}`;
}

async function doInstall(api, threadID, id, forceKind = null) {

  let cmd = null;
  try {
    cmd = await apiGetOne(id);
  } catch (err) {
    return api.sendMessage(
      `❌ Failed to fetch command.\n` +
      `╭─‣ ID : ${id}\n` +
      `├‣ Reason : ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}\n` +
      `╰────────────◊`,
      threadID
    );
  }

  if (!cmd) return api.sendMessage(`❌ Command not found for ID: ${id}`, threadID);
  if (!cmd.code && !cmd.pastebin_url)
    return api.sendMessage("❌ Command has no code or Pastebin link stored.", threadID);

  const isEvent = forceKind ? forceKind === "event" : cmd.kind === "event";

  let code = cmd.code || "";
  if (!code && cmd.pastebin_url) {
    try {
      const pbRes = await axios.get(cmd.pastebin_url, { timeout: 10000, responseType: "text" });
      code = typeof pbRes.data === "string" ? pbRes.data : String(pbRes.data);
    } catch (_) {
      return api.sendMessage(
        `❌ Failed to fetch code from Pastebin.\n` +
        `╭─‣ URL: ${cmd.pastebin_url}\n╰────────────◊\n` +
        `💡 Try again or check the Pastebin link.`,
        threadID
      );
    }
  }

  if (code) {
    try { new Function(code); }
    catch (err) { return api.sendMessage(`❌ Syntax error in remote code:\n${err.message}`, threadID); }
  }

  const displayName = cmd.name || `gs_${id}`;
  let pid;
  try { pid = await animateInstall(api, threadID, displayName); } catch (_) {}

  const installDir = isEvent ? getEventsDir() : getCmdsDir();

  const safeName = String(displayName).replace(/[^\w\-. ]+/g, "").trim().replace(/\s+/g, "_").replace(/^\.+/, "") || `gs_${id}`;
  const fileName = safeName + ".js";
  const filePath = path.join(installDir, fileName);
  const locLabel = path.relative(process.cwd(), filePath);

  try {
    if (path.dirname(path.resolve(filePath)) !== path.resolve(installDir)) throw new Error("Unsafe file name.");
    if (!fs.existsSync(installDir)) fs.mkdirSync(installDir, { recursive: true });

    if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") !== code)
      fs.copyFileSync(filePath, filePath + ".bak");
    fs.writeFileSync(filePath, code, "utf-8");
  } catch (err) {
    if (pid) api.unsendMessage(pid).catch(() => {});
    return api.sendMessage(`❌ Failed to write file:\n${err.message}`, threadID);
  }

  const load = isEvent ? { success: false } : autoloadCommand(filePath);
  apiCountInstall(cmd._id || id);

  const msg =
    `✅ Installed Successfully!\n` +
    `╭─‣ Name : ${cmd.name || "Unknown"}\n` +
    `├‣ Author : ${cmd.author || "Unknown"}\n` +
    `├‣ Category : ${catBadge(cmd)}\n` +
    `├‣ ID : ${displayId(cmd)}\n` +
    `├‣ Location : ${locLabel}\n` +
    `╰────────────◊\n` +
    (load.success
      ? `🚀 "${load.name}" is now live! No restart needed.`
      : isEvent
      ? `⚠️ Event saved. Restart bot to apply.`
      : `⚠️ Autoload failed: ${load.reason}`);

  if (pid) {
    try {
      await api.editMessage(msg, pid);
      setTimeout(() => api.unsendMessage(pid).catch(() => {}), 6000);
    } catch (_) { api.sendMessage(msg, threadID); }
  } else {
    api.sendMessage(msg, threadID);
  }
}

async function doUpload(api, threadID, filePath, kind = "command") {
  let code;
  try { code = fs.readFileSync(filePath, "utf8"); }
  catch (err) { return api.sendMessage(`❌ Read failed:\n${err.message}`, threadID); }

  try { new Function(code); }
  catch (err) { return api.sendMessage(`❌ Syntax Error:\n${err.message}`, threadID); }

  const { name, author, description, category, version } = extractMeta(code, path.basename(filePath, ".js"), true);

  let pid;
  try { pid = await animateUpload(api, threadID, name); } catch (_) {}

  try {
    const result = await apiUpload({ name, category, description, author, code, kind, version });

    if (result._duplicate) {
      if (pid) api.unsendMessage(pid).catch(() => {});
      return api.sendMessage(
        `⚠️ Command Already Exists!\n` +
        `╭─‣ Name : ${name}\n` +
        `├‣ Author : ${author}\n` +
        `├‣ Version : v${version}\n` +
        `├‣ ID : ${displayId(result)}\n` +
        `╰────────────◊\n` +
        `💡 "${name}" by ${author} v${version} is already in the store. Change the version number to update it.`,
        threadID
      );
    }

    if (result.error) {
      if (pid) api.unsendMessage(pid).catch(() => {});
      return api.sendMessage(
        `⚠️ Upload Failed!\n╭─‣ Name : ${name}\n├‣ Error : ${result.error}\n╰────────────◊`,
        threadID
      );
    }

    const isUpdated = result._updated === true;
    const newId     = result._id || result.id;

    let rawUrl = result.pastebin_url || null;
    if (!rawUrl && newId && code) rawUrl = await getRawLink({ ...result, code });

    const sameNameCount = result._sameNameCount || 0;

    let statusLine, footerLine;
    if (isUpdated) {
      statusLine = `♻️ Command Updated!`;
      footerLine = `🔄 "${name}" by ${author} updated to v${version} — old version overwritten.\n📅 Updated: ${new Date().toDateString()}`;
    } else {
      statusLine = `✅ Upload Successful!`;
      footerLine = sameNameCount > 0
        ? `📌 ${sameNameCount} other command(s) use the name "${name}" (different author) — saved as separate entry.\n📅 Uploaded: ${new Date().toDateString()}`
        : `📅 Uploaded: ${new Date().toDateString()}`;
    }

    const msg =
      `${statusLine}\n` +
      `╭─‣ Name : ${name}\n` +
      `├‣ Category : ${catBadge({ category })}\n` +
      `├‣ Author : ${author}\n` +
      `├‣ Version : v${version}\n` +
      `├‣ ID : ${displayId(result) !== "N/A" ? displayId(result) : (newId || "N/A")}\n` +
      (rawUrl ? `├‣ Raw Link : ${rawUrl}\n` : "") +
      `╰────────────◊\n` +
      footerLine;

    if (pid) {
      try { await api.editMessage(msg, pid); }
      catch (_) { api.sendMessage(msg, threadID); }
    } else {
      api.sendMessage(msg, threadID);
    }
  } catch (err) {

    if (pid) api.unsendMessage(pid).catch(() => {});
    api.sendMessage(
      `❌ Store API Call Failed!\n├‣ Error : ${err.message || "Unknown error"}\n╰────────────◊\n💡 Check network or store backend.`,
      threadID
    );
  }
}

async function checkSelfUpdate() {
  const now = Date.now();
  if (_updateCheckCache && (now - _updateCheckCache.checkedAt) < CONFIG.UPDATE_CHECK_INTERVAL)
    return _updateCheckCache.result;
  try {

    const cmds = await apiSearch("goatstore");

    const myAuthor = String(module.exports.config.author || "").trim().toLowerCase();
    const match = cmds.find(c =>
      String(c.name || "").trim().toLowerCase() === "goatstore" &&
      (c.kind || "command") === "command" &&
      String(c.author || "").trim().toLowerCase() === myAuthor);
    if (!match) { _updateCheckCache = { checkedAt: now, result: null }; return null; }
    const current = module.exports.config.version;
    const latest  = match.version || "0.0.0";
    const result = {
      hasUpdate:      cmpVer(latest, current) > 0,
      currentVersion: current,
      latestVersion:  latest,
      latestId:       match._id || match.id,
      description:    match.description || "",
    };
    _updateCheckCache = { checkedAt: now, result };
    return result;
  } catch (_) { return null; }
}

async function doSelfUpdateSilent(api, threadID, selfUpdate) {
  try {
    const cmd = await apiGetOne(selfUpdate.latestId);
    if (!cmd?.code) return false;
    try { new Function(cmd.code); } catch (_) { return false; }
    if (detectFramework(cmd.code) !== "goat") return false;
    try { fs.copyFileSync(__filename, __filename + ".bak"); } catch (_) {}
    fs.writeFileSync(__filename, cmd.code, "utf-8");
    const load = autoloadCommand(__filename);
    if (api && threadID) {
      const msg =
        `♻️ Auto-Updated GoatStore!\n` +
        `╭─‣ Version : v${cmd.version || selfUpdate.latestVersion}\n` +
        `╰────────────◊\n` +
        `📝 ${(cmd.description || "No changelog.").trim()}\n\n` +
        (load.success ? `🚀 Live now!` : `⚠️ Restart bot to apply.`);
      api.sendMessage(msg, threadID).catch(() => {});
    }
    return true;
  } catch (_) { return false; }
}

async function maybeAutoUpdate(api, threadID) {
  if (_autoupdateInFlight) return;
  const info = await checkSelfUpdate();
  if (!info?.hasUpdate) return;
  _autoupdateInFlight = true;
  try { await doSelfUpdateSilent(api, threadID, info); }
  finally { _autoupdateInFlight = false; }
}

let _syncRunning = false;
const _warned401 = new Set();

async function runAutoSync() {
  const summary = { uploaded: 0, updated: 0, duplicates: 0, unchanged: 0, errors: 0, busy: false };

  if (_syncRunning) { summary.busy = true; return summary; }
  _syncRunning = true;

  try {
    const folders = [
      { dir: getCmdsDir(),    kind: "command" },
      { dir: getEventsDir(),  kind: "event" },
    ].filter(f => f.dir && fs.existsSync(f.dir));

    if (!folders.length) return summary;
    const cache = loadJson(SYNC_CACHE_PATH, {});

    for (const { dir, kind } of folders) {
      let files = [];
      try { files = fs.readdirSync(dir).filter(f => f.endsWith(".js")); } catch (_) { continue; }

      for (const file of files) {
        const fullPath = path.join(dir, file);
        let code;
        try { code = fs.readFileSync(fullPath, "utf8"); } catch (_) { continue; }

        try { new Function(code); } catch (_) { continue; }

        if (detectFramework(code) !== "goat") continue;

        const { name, author, description, category, version } = extractMeta(code, path.basename(file, ".js"));

        const hash = hashContent(code);

        const cacheKey = `${kind}:${file}:${version}`;
        if (cache[cacheKey]?.hash === hash) { summary.unchanged++; continue; }

        try {
          const result = await apiUpload({ name, category, description, author, code, kind, version });
          if (result._duplicate) {

            cache[cacheKey] = { hash, id: result._id || result.id };
            summary.duplicates++;
            console.log(`[goatstore-sync] ${file}: already exists (${name} by ${author} v${version}) — skipped. Bump the version to update it.`);
          } else if (!result.error) {
            cache[cacheKey] = { hash, id: result._id || result.id };
            if (result._updated) summary.updated++; else summary.uploaded++;
            const tag = result._updated ? `updated to v${version}` : "uploaded as new entry";
            console.log(`[goatstore-sync] ${file}: ${tag} (ID: ${displayId(result)})`);
          } else if (result._status === 401) {

            summary.unchanged++;
            if (!_warned401.has(file)) { _warned401.add(file); console.log(`[goatstore-sync] ${file}: not synced — ${result.error}`); }
          } else {
            summary.errors++;
            console.log(`[goatstore-sync] ${file}: skipped — ${result.error}`);
          }
        } catch (err) {
          summary.errors++;
          console.error(`[goatstore-sync] ${file}: error — ${err.message}`);
        }
        await new Promise(r => setTimeout(r, 600));
      }
    }
    saveJson(SYNC_CACHE_PATH, cache);
    return summary;
  } finally {
    _syncRunning = false;
  }
}

let _watchDebounce = null;
let _watchersStarted = false;

function startAutoSyncWatcher() {
  if (_watchersStarted) return;
  _watchersStarted = true;

  const dirs = [getCmdsDir(), getEventsDir()].filter(d => d && fs.existsSync(d));

  for (const dir of dirs) {
    try {
      fs.watch(dir, { persistent: false }, (eventType, filename) => {
        if (!filename || !filename.endsWith(".js")) return;

        clearTimeout(_watchDebounce);
        _watchDebounce = setTimeout(() => {
          runAutoSync().catch(() => {});
        }, 3000);
      });
    } catch (_) {

    }
  }
}

async function getTodayUpdates() {
  try {
    const all   = await apiSearch("");
    const today = new Date().toDateString();
    return all.filter(c => new Date(c.createdAt || c.updatedAt || 0).toDateString() === today);
  } catch (_) { return []; }
}

function paginateArray(arr, page, limit) {
  const total      = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset     = (page - 1) * limit;
  const slice      = arr.slice(offset, offset + limit);
  return { items: slice, total, totalPages };
}

function renderCmdRow(cmd) {
  return (
    `╭─‣ ${cmd.kind === "event" ? "⚡" : "🧩"} ${cmd.name} 〄\n` +
    `├‣ ID : ${displayId(cmd)}\n` +
    `├‣ Author : ${cmd.author || "Unknown"}\n` +
    `├‣ Category : ${catBadge(cmd)}\n` +
    `├‣ Likes : ❤️ ${cmd.likes || 0}\n` +
    `╰────────────◊\n` +
    ` ✰ Added : ${new Date(cmd.createdAt || Date.now()).toDateString()}\n\n`
  );
}

async function sendListPage(api, threadID, senderID, category, page, limit, prefix) {
  try {
    const all  = await apiSearch("", category);
    const { items, total, totalPages } = paginateArray(all, page, limit);
    if (!items.length) return api.sendMessage("❌ No commands found for this page.", threadID);

    const label = category ? `📂 Category: ${category}` : "📂 All Commands";
    let msg = `${label} — Page ${page}/${totalPages} (${total} total)\n\n`;
    items.forEach(cmd => { msg += renderCmdRow(cmd); });
    if (totalPages > 1)
      msg += `Reply "page <number>" or react ➡ to go to next page.\n` +
             `💬 Reply "delete <id>" to remove (admin only).`;

    const sent = await api.sendMessage(msg.trim(), threadID);
    if (totalPages > 1) {
      const h = {
        commandName: "goatstore", messageID: sent.messageID,
        mode: "list", category, page, totalPages, limit, senderID, editCount: 0,
      };
      global.GoatBot.onReply.set(sent.messageID, h);
      global.GoatBot.onReaction.set(sent.messageID, h);
    }
  } catch (_) { api.sendMessage("❌ List API error.", threadID); }
}

function searchTitle(query, category, kind, author) {
  if (query)  return `🔍 Search: "${query}"`;
  if (author) return `👤 Author: ${author}`;
  if (kind)   return `${kind === "event" ? "⚡ Events" : "🧩 Commands"}${category ? ` — ${category}` : ""}`;
  return `📂 Category: ${category || "all"}`;
}

async function sendSearchPage(api, threadID, senderID, query, category, page, limit, prefix, kind = "", author = "") {
  try {
    const all  = await apiSearch(query, category, 0, kind, author);
    const { items, total, totalPages } = paginateArray(all, page, limit);
    if (!items.length)
      return api.sendMessage(`❌ No results${query ? ` for "${query}"` : author ? ` for author "${author}"` : ""}.`, threadID);

    const title = searchTitle(query, category, kind, author);
    let msg = `${title} (${total} found)\n\n`;
    items.forEach(cmd => { msg += renderCmdRow(cmd); });
    if (totalPages > 1)
      msg += `Page ${page}/${totalPages}\nReply "page <number>" or react ➡ next page.\n`;
    msg += `💬 Reply "delete <id>" to remove (admin only).`;

    const sent = await api.sendMessage(msg.trim(), threadID);
    const h = {
      commandName: "goatstore", messageID: sent.messageID,
      mode: "search", query, category, kind, author, page, totalPages, limit, senderID, editCount: 0,
    };
    global.GoatBot.onReply.set(sent.messageID, h);
    if (totalPages > 1) global.GoatBot.onReaction.set(sent.messageID, h);
  } catch (_) { api.sendMessage("❌ Search API error.", threadID); }
}

async function renderListInto(category, page, limit) {
  const all  = await apiSearch("", category);
  const { items, total, totalPages } = paginateArray(all, page, limit);
  if (!items.length) return null;
  const label = category ? `📂 Category: ${category}` : "📂 All Commands";
  let msg = `${label} — Page ${page}/${totalPages} (${total} total)\n\n`;
  items.forEach(cmd => { msg += renderCmdRow(cmd); });
  if (totalPages > 1) msg += `React ➡ next page.`;
  return { text: msg.trim(), totalPages };
}

async function renderSearchInto(query, category, page, limit, kind = "", author = "") {
  const all  = await apiSearch(query, category, 0, kind, author);
  const { items, total, totalPages } = paginateArray(all, page, limit);
  if (!items.length) return null;
  const title = searchTitle(query, category, kind, author);
  let msg = `${title} (${total} found)\n\n`;
  items.forEach(cmd => { msg += renderCmdRow(cmd); });
  if (totalPages > 1) msg += `Page ${page}/${totalPages}\nReact ➡ next page.`;
  return { text: msg.trim(), totalPages };
}

function buildMenu(prefix) {
  const p = `${prefix}gs`;
  return (
    `📦 GoatStore — Command Marketplace\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `• ${p}              — Menu / Notifications\n` +
    `• ${p} n            — Today's new commands\n` +
    `• ${p} list [page]  — Browse all commands\n` +
    `• ${p} list <cat> [page]  — Browse by category\n` +
    `• ${p} events       — Browse events only\n` +
    `• ${p} commands     — Browse commands only\n` +
    `• ${p} <name/id>    — Search by name, author, or ID\n` +
    `• ${p} author <n>   — All by an author\n` +
    `• ${p} install <id> — Install a command\n` +
    `• ${p} event install <id> — Install as event\n` +
    `• ${p} like <id>    — Like/unlike\n` +
    `• ${p} trending     — Top trending\n` +
    `• ${p} upload <file>       — Upload command\n` +
    `• ${p} upload event <file> — Upload event\n` +
    `• ${p} update <file>       — Same as upload; overwrites in place if name+author already exist with a new version\n` +
    `• ${p} rawlink <id> — Get raw Pastebin link\n` +
    `• ${p} delete <id>  — Delete (admin)\n` +
    `• ${p} sync         — Manual sync\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Categories: ${CONFIG.CATEGORIES.join(", ")}\n` +
    `Reply "page <n>" on any list to jump pages.\n` +
    `React ➡ on any list to go to next page.`
  );
}

module.exports = {
  config: {
    name:             "goatstore",
    aliases:          ["gs", "store", "cmdstore"],
    version:          "1.1.0",
    author:           "Hridoy Hossen",
    countDown:        3,
    role:             0,
    shortDescription: "GoatStore — Browse, install & upload GoatBot commands",
    longDescription:  "Full-featured store command: search, install, upload, like, trending, pagination and auto-sync for GoatBot.",
    category:         "System",
    guide: {
      en:
        "{pn} — Menu\n" +
        "{pn} n — Today's updates\n" +
        "{pn} list [page] — All commands\n" +
        "{pn} list <category> [page] — By category\n" +
        "{pn} <query> — Search\n" +
        "{pn} author <name> — By author\n" +
        "{pn} install <id> — Install\n" +
        "{pn} event install <id> — Install as event\n" +
        "{pn} like <id> — Like\n" +
        "{pn} trending — Top trending\n" +
        "{pn} upload <file> — Upload\n" +
        "{pn} upload event <file> — Upload event\n" +
        "{pn} update <file> — Same as upload; overwrites in place on a version bump\n" +
        "{pn} rawlink <id> — Get Pastebin raw link\n" +
        "{pn} delete <id> — Admin delete\n" +
        "{pn} sync — Manual sync",
    },
    autoSync: CONFIG.AUTO_SYNC,
  },

  onLoad: function () {

    if (global.__goatstoreStarted) return;
    global.__goatstoreStarted = true;

    setTimeout(() => {
      maybeAutoUpdate(null, null).catch(() => {});
      setInterval(() => maybeAutoUpdate(null, null).catch(() => {}), CONFIG.UPDATE_CHECK_INTERVAL);
    }, 6000);

    if (module.exports.config.autoSync) {
      setTimeout(() => {
        runAutoSync().catch(() => {});
        setInterval(() => runAutoSync().catch(() => {}), CONFIG.AUTO_SYNC_INTERVAL);
      }, 10000);

      if (CONFIG.AUTO_SYNC_WATCH) startAutoSyncWatcher();
    }
  },

  onReply: async function ({ api, event, Reply }) {
    const { threadID, senderID } = event;
    const body = String(event.body || "");
    if (!isAllowed(senderID)) return;

    const delMatch = body.match(/^delete\s+(\S+)/i);
    if (delMatch) {
      const rawId = delMatch[1];
      const id = rawId.replace(/^#/, "");
      try {
        await apiDelete(id);
        return api.sendMessage(`🗑️ Deleted! ID: ${rawId}`, threadID);
      } catch (err) {
        const e = err.response?.data?.error || err.message;
        return api.sendMessage(`❌ Delete failed: ${e}`, threadID);
      }
    }

    const { mode, query, category, kind = "", author = "", page, totalPages, limit, senderID: origSender } = Reply;
    if (String(senderID) !== String(origSender)) return;

    const match = body.match(/^page\s+(\d+)$/i);
    if (!match) return;
    const newPage = parseInt(match[1]);
    if (newPage < 1 || newPage > totalPages)
      return api.sendMessage(`❌ Page must be between 1 and ${totalPages}.`, threadID);

    api.unsendMessage(Reply.messageID).catch(() => {});
    const prefix = getPrefix(event.threadData);
    if (mode === "list")
      await sendListPage(api, threadID, senderID, category, newPage, limit, prefix);
    else
      await sendSearchPage(api, threadID, senderID, query, category, newPage, limit, prefix, kind, author);
  },

  onReaction: async function ({ api, event, Reaction }) {
    const { threadID, userID } = event;
    if (!isAllowed(userID)) return;

    const { mode, query, category, kind = "", author = "", page, totalPages, limit, senderID, messageID, editCount = 0 } = Reaction;
    if (String(userID) !== String(senderID)) return;
    if (page >= totalPages)
      return api.sendMessage("✅ Already on the last page.", threadID);

    const nextPage = page + 1;
    try {
      const rendered = mode === "list"
        ? await renderListInto(category, nextPage, limit)
        : await renderSearchInto(query, category, nextPage, limit, kind, author);

      if (!rendered) return api.sendMessage("❌ No results for this page.", threadID);

      if (editCount >= CONFIG.MAX_EDITS_PER_MESSAGE) {
        const sent = await api.sendMessage(rendered.text, threadID);
        const h = { commandName: "goatstore", messageID: sent.messageID, mode, query, category, kind, author, page: nextPage, totalPages: rendered.totalPages, limit, senderID, editCount: 0 };
        global.GoatBot.onReply.set(sent.messageID, h);
        global.GoatBot.onReaction.set(sent.messageID, h);
      } else {
        await api.editMessage(rendered.text, messageID);
        const h = { commandName: "goatstore", messageID, mode, query, category, kind, author, page: nextPage, totalPages: rendered.totalPages, limit, senderID, editCount: editCount + 1 };
        global.GoatBot.onReply.set(messageID, h);
        global.GoatBot.onReaction.set(messageID, h);
      }
    } catch (_) {
      api.unsendMessage(messageID).catch(() => {});
      const prefix = getPrefix(event.threadData);
      if (mode === "list")
        await sendListPage(api, threadID, senderID, category, nextPage, limit, prefix);
      else
        await sendSearchPage(api, threadID, senderID, query, category, nextPage, limit, prefix, kind, author);
    }
  },

  onStart: async function ({ api, event, args, threadData }) {
    const { threadID, senderID } = event;

    if (!isAllowed(senderID))
      return api.sendMessage("❌ You are not allowed to use this command.", threadID, event.messageID);

    const prefix = getPrefix(threadData || event?.threadData);
    const sub    = args[0]?.toLowerCase() || null;

    maybeAutoUpdate(api, threadID).catch(() => {});

    if (!sub) {
      const updates = await getTodayUpdates();
      if (updates.length && !userSeenNoti.get(senderID)) {
        let n = `🔔 [ NOTIFICATION ]\nToday ${updates.length} new command(s)!\n━━━━━━━━━━━━\n`;
        updates.forEach(c => { n += ` ‣ ${c.name} (ID: ${displayId(c)})\n`; });
        n += `\n(Type "${prefix}gs n" for details or "${prefix}gs" again for menu)`;
        userSeenNoti.set(senderID, true);
        return api.sendMessage(n, threadID);
      }
      return api.sendMessage(buildMenu(prefix), threadID);
    }

    if (sub === "n" || sub === "notification") {
      const updates = await getTodayUpdates();
      if (!updates.length)
        return api.sendMessage("📅 No new commands today.", threadID);
      let msg = `📂 Today's New Commands\n━━━━━━━━━━━━\n`;
      updates.forEach(c =>
        msg += `╭─‣ ${c.name}\n├‣ ID: ${displayId(c)}\n├‣ Author: ${c.author}\n╰────────────◊\n\n`
      );
      return api.sendMessage(msg.trim(), threadID);
    }

    if (sub === "sync") {
      api.sendMessage("🔄 Starting manual sync...", threadID);
      try {
        const r = await runAutoSync();
        if (r.busy) return api.sendMessage("⏳ A sync is already running — try again in a moment.", threadID);
        api.sendMessage(
          `✅ Sync complete.\n` +
          `╭─‣ New : ${r.uploaded}\n` +
          `├‣ Updated : ${r.updated}\n` +
          `├‣ Already in store : ${r.duplicates}\n` +
          `├‣ Unchanged : ${r.unchanged}\n` +
          `├‣ Errors : ${r.errors}\n` +
          `╰────────────◊`,
          threadID
        );
      } catch (err) {
        api.sendMessage(`❌ Sync failed: ${err.message}`, threadID);
      }
      return;
    }

    if (sub === "list" || sub === "ls") {

      const maybeCategory = args[1]?.toLowerCase();
      const isCategory    = CONFIG.CATEGORIES.includes(maybeCategory);
      const category      = isCategory ? maybeCategory : "";
      const page          = Math.max(1, Number(isCategory ? args[2] : args[1]) || 1);
      return sendListPage(api, threadID, senderID, category, page, 8, prefix);
    }

    if (sub === "event") {
      const action = args[1]?.toLowerCase();
      if (action === "install") {
        const id = args[2];
        if (!id) return api.sendMessage(`❌ Usage: ${prefix}gs event install <id>`, threadID);
        return doInstall(api, threadID, id, "event");
      }

      const q = args.slice(1).join(" ");
      return sendSearchPage(api, threadID, senderID, q, "", 1, 5, prefix, "event");
    }

    if (sub === "install") {
      const id = args[1];
      if (!id) return api.sendMessage(`❌ Usage: ${prefix}gs install <id>`, threadID);
      return doInstall(api, threadID, id, null);
    }

    if (sub === "like") {
      const rawId = args[1];
      if (!rawId) return api.sendMessage(`❌ Usage: ${prefix}gs like <id>`, threadID);
      const id = rawId.replace(/^#/, "");
      try {
        const res = await apiLike(id, getVisitorId());
        if (res.liked)
          return api.sendMessage(`❤️ Liked! Total likes: ${res.likes}`, threadID);
        else
          return api.sendMessage(`💔 Unliked. Total likes: ${res.likes}`, threadID);
      } catch (_) { return api.sendMessage("❌ Like API error.", threadID); }
    }

    if (sub === "trend" || sub === "trending") {
      try {
        const list = await apiTrending(8);
        if (!list.length) return api.sendMessage("❌ No trending commands yet.", threadID);
        let msg = `🔥 Top Trending Commands 🔥\n\n`;
        list.forEach((cmd, i) => {
          msg +=
            `╭─‣ ${cmd.name}${i === 0 ? " 🏆" : ""}\n` +
            `├‣ Category : ${catBadge(cmd)}\n` +
            `├‣ Likes : ❤️ ${cmd.likes || 0}\n` +
            `├‣ Author : ${cmd.author || "Unknown"}\n` +
            `├‣ ID : ${displayId(cmd)}\n` +
            `╰────────────◊\n\n`;
        });
        return api.sendMessage(msg.trim(), threadID);
      } catch (_) { return api.sendMessage("❌ Trending API error.", threadID); }
    }

    if (sub === "upload" || sub === "update") {
      const isEvent = args[1]?.toLowerCase() === "event";
      const fileName = isEvent ? args[2] : args[1];
      const kind     = isEvent ? "event" : "command";
      if (!fileName)
        return api.sendMessage(
          `📁 Usage:\n• ${prefix}gs ${sub} <fileName>\n• ${prefix}gs ${sub} event <fileName>\n` +
          `💡 Same name + author already in the store, but a different (bumped) version in the file = the existing entry is overwritten in place (same ID, likes kept). Same version = blocked as a duplicate.`,
          threadID
        );

      const cwd = process.cwd();
      const stdCmds   = path.join(cwd, "scripts", "cmds");
      const stdEvents = path.join(cwd, "scripts", "events");
      const dirs = kind === "event"
        ? [getEventsDir(), stdEvents, path.join(cwd, "events")]
        : [getCmdsDir(), stdCmds, getEventsDir(), stdEvents, cwd];
      let filePath = null;
      for (const dir of dirs) {
        if (fs.existsSync(path.join(dir, fileName)))           { filePath = path.join(dir, fileName); break; }
        if (fs.existsSync(path.join(dir, fileName + ".js")))   { filePath = path.join(dir, fileName + ".js"); break; }
      }
      if (!filePath) return api.sendMessage(`❌ File not found: "${fileName}"`, threadID);
      return doUpload(api, threadID, filePath, kind);
    }

    if (sub === "rawlink" || sub === "raw") {
      const id = args[1];
      if (!id) return api.sendMessage(`❌ Usage: ${prefix}gs rawlink <id>`, threadID);

      const loadMsg = await api.sendMessage(`⏳ Fetching raw link for ID: ${id}...`, threadID);

      try {
        const cmd = await apiGetOne(id);
        if (!cmd) {
          api.unsendMessage(loadMsg.messageID).catch(() => {});
          return api.sendMessage(`❌ Command not found for ID: ${id}`, threadID);
        }

        if (cmd.pastebin_url) {
          api.unsendMessage(loadMsg.messageID).catch(() => {});
          return api.sendMessage(
            `🔗 Raw Link — ${cmd.name}\n` +
            `╭─‣ Pastebin : ${cmd.pastebin_url}\n` +
            `╰────────────◊\n` +
            `💡 Open the link to copy the raw code.`,
            threadID
          );
        }

        if (!cmd.code) {
          api.unsendMessage(loadMsg.messageID).catch(() => {});
          return api.sendMessage("❌ This command has no code stored.", threadID);
        }

        const rawUrl = await getRawLink(cmd);

        if (!rawUrl) {
          api.unsendMessage(loadMsg.messageID).catch(() => {});
          return api.sendMessage(
            `❌ Could not create a raw link right now.\n` +
            `╭─‣ The store server or Pastebin refused the request — try again shortly.\n` +
            `╰────────────◊`,
            threadID
          );
        }

        api.unsendMessage(loadMsg.messageID).catch(() => {});
        return api.sendMessage(
          `✅ Raw Link Generated!\n` +
          `╭─‣ Name : ${cmd.name}\n` +
          `├‣ Author : ${cmd.author || "Unknown"}\n` +
          `├‣ Pastebin : ${rawUrl}\n` +
          `╰────────────◊\n` +
          `💾 Link saved to store for instant access next time.`,
          threadID
        );
      } catch (err) {
        api.unsendMessage(loadMsg.messageID).catch(() => {});
        return api.sendMessage(`❌ Error: ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`, threadID);
      }
    }

    if (sub === "delete") {
      const rawId = args[1];
      if (!rawId) return api.sendMessage(`❌ Usage: ${prefix}gs delete <id>`, threadID);
      const id = rawId.replace(/^#/, "");
      try {
        await apiDelete(id);
        return api.sendMessage(`🗑️ Deleted! ID: ${rawId}`, threadID);
      } catch (err) {
        const e = err.response?.data?.error || err.message;
        return api.sendMessage(`❌ Delete failed: ${e}`, threadID);
      }
    }

    if (sub === "author") {
      const authorName = args.slice(1).join(" ");
      if (!authorName) return api.sendMessage(`❌ Usage: ${prefix}gs author <name>`, threadID);
      return sendSearchPage(api, threadID, senderID, "", "", 1, 5, prefix, "", authorName);
    }

    if (sub === "search" || sub === "find") {
      const q = args.slice(1).join(" ").trim();
      if (!q) return api.sendMessage(`❌ Usage: ${prefix}gs search <name / author / id>`, threadID);
      return sendSearchPage(api, threadID, senderID, q, "", 1, 5, prefix);
    }

    if (sub === "cat" || sub === "category") {
      const cat = args[1]?.toLowerCase();
      if (!CONFIG.CATEGORIES.includes(cat))
        return api.sendMessage(
          `❌ Usage: ${prefix}gs cat <${CONFIG.CATEGORIES.join("|")}>`,
          threadID
        );
      return sendListPage(api, threadID, senderID, cat, 1, 8, prefix);
    }

    if (sub === "events" || sub === "event") {
      const list = await apiSearch("", "", 0, "event").catch(() => []);
      if (!list.length) return api.sendMessage("❌ No events stored yet.", threadID);
      let msg = `⚡ Events (${list.length} total)\n\n`;
      list.slice(0, 10).forEach(cmd => { msg += renderCmdRow(cmd); });
      if (list.length > 10) msg += `…and ${list.length - 10} more. Use ${prefix}gs search <name> to find a specific one.`;
      return api.sendMessage(msg.trim(), threadID);
    }
    if (sub === "commands") {
      const list = await apiSearch("", "", 0, "command").catch(() => []);
      if (!list.length) return api.sendMessage("❌ No commands stored yet.", threadID);
      let msg = `🧩 Commands (${list.length} total)\n\n`;
      list.slice(0, 10).forEach(cmd => { msg += renderCmdRow(cmd); });
      if (list.length > 10) msg += `…and ${list.length - 10} more. Use ${prefix}gs search <name> to find a specific one.`;
      return api.sendMessage(msg.trim(), threadID);
    }

    const query = args.join(" ").trim();
    const looksLikeId = /^[a-f\d]{24}$/i.test(query) || /^#?\d+$/.test(query);
    if (looksLikeId) {
      try {
        const cmd = await apiGetOne(query.replace(/^#/, ""));
        if (!cmd) return api.sendMessage(`❌ Command not found for ID: ${query}`, threadID);
        const cmdMongoId = cmd._id || cmd.id;

        let rawLine;
        if (cmd.pastebin_url) {
          rawLine = `🔗 Raw: ${cmd.pastebin_url}`;
        } else if (cmd.code) {
          const rawUrl = await getRawLink(cmd);
          if (rawUrl) {
            rawLine = `🔗 Raw: ${rawUrl}`;
          } else {
            rawLine = `⚠️ Raw link couldn't be generated right now — try ${prefix}gs rawlink ${displayId(cmd)} again shortly.`;
          }
        } else {
          rawLine = `⚠️ No code stored for this ${cmd.kind === "event" ? "event" : "command"} — nothing to link.`;
        }

        const msg =
          `${catBadge(cmd)}\n` +
          `╭─‣ Name : ${cmd.name}\n` +
          `├‣ Type : ${cmd.kind === "event" ? "⚡ Event" : "🧩 Command"}\n` +
          `├‣ Author : ${cmd.author || "Unknown"}\n` +
          `├‣ Category : ${catBadge(cmd)}\n` +
          `├‣ Likes : ❤️ ${cmd.likes || 0}\n` +
          `├‣ ID : ${displayId(cmd)}\n` +
          `╰────────────◊\n` +
          `📝 ${cmd.description || "No description"}\n` +
          `📅 Added: ${new Date(cmd.createdAt || Date.now()).toDateString()}\n` +
          rawLine;
        return api.sendMessage(msg.trim(), threadID);
      } catch (err) {
        return api.sendMessage(
          `❌ Details fetch error.\n╭─‣ ID : ${query}\n├‣ Reason : ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}\n╰────────────◊`,
          threadID
        );
      }
    }

    return sendSearchPage(api, threadID, senderID, query, "", 1, 5, prefix);
  },
};
