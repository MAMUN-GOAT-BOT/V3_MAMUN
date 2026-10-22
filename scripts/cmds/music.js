const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "cache");
const API_BASE = "https://musicapi-by-raihan.vercel.app";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1"
];

const REGEX = {
  SANITIZE: /[^a-z0-9]/gi,
  SPLIT_ARTIST: /\s*-\s*/,
  VALID_NUMBER: /^\d+$/,
  URL: /(https?:\/\/[^\s]+)/g,
  VIDEO_ID: /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?]|$)/
};

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const CONFIG = {
  CACHE_DIR: path.join(__dirname, "cache"),
  API_BASE: "https://musicapi-by-raihan.vercel.app",
  TIMEOUTS: {
    FETCH: 15000,
    DOWNLOAD: 60000
  },
  LIMITS: {
    SONG_LIST: 5,
    TRENDING_LIMIT: 10,
    LYRICS_MAX: 1800,
    CLEANUP_DELAY: 10000
  }
};

const ENDPOINTS = {
  SEARCH: "/api/search",
  DOWNLOAD: "/api/download",
  DISCOVER: "/api/discover",
  ALBUM: "/api/albums",
  PLAYLIST: "/api/playlists",
  ARTIST: "/api/artists",
  LYRICS: "/api/lyrics",
  RECOMMEND: "/api/recommendations",
  SEARCH_ALL: "/api/search/all"
};

const COMMANDS = {
  DISCOVER: "discover",
  ALBUM: "album",
  PLAYLIST: "playlist",
  ARTIST: "artist",
  LYRICS: "lyrics",
  RECOMMEND: "recommend"
};

const OUTPUTS = {
  SEARCHING: "Searching for",
  FOUND: "Here's what I found for",
  REPLY_DOWNLOAD: "Reply with the number to download",
  DOWNLOADING: "Downloading",
  DOWNLOAD_COMPLETE: "Download complete",
  NO_SONGS: "We couldn't find any songs matching your search. Try using different keywords or check the spelling.",
  INVALID_SELECTION: "Invalid selection. Please choose a number from the list.",
  API_ERROR: "Oops! Something went wrong. The music service is currently unavailable. Please try again in a few moments.",
  HELP: "MUSIC COMMANDS\n\n.music <song name> - Search & download\n.music discover - Trending hits\n.music album <id> - Album tracks\n.music playlist <id> - Playlist tracks\n.music artist <id> - Artist details\n.music lyrics <artist> - <title>\n.music recommend <track_id>",
  LYRICS_FORMAT: "Please use this format: .music lyrics <artist> - <title>\n\nExample: .music lyrics Ed Sheeran - Perfect",
  NO_TRENDING: "No trending songs are available at the moment. Please try again later.",
  NO_TRACKS: "We couldn't find any tracks in this album or playlist. Please verify the ID and try again.",
  ARTIST_NOT_FOUND: "We couldn't find this artist in our database. Please verify the artist name and try again.",
  LYRICS_NOT_FOUND: "Sorry, we couldn't find the lyrics for this song. Please check the artist and song title.",
  NO_RECOMMENDATIONS: "We couldn't find any recommendations for this track. Please try another track ID."
};

const REACTIONS = {
  SEARCHING: "🔍",
  SUCCESS: "✅",
  FAILED: "❎",
  DOWNLOADING: "💭"
};

function setReaction(api, messageID, emoji) {
  try {
    if (!messageID || !api || typeof api.setMessageReaction !== "function") {
      return;
    }
    api.setMessageReaction(emoji, messageID, () => {}, true);
  } catch (e) {
    console.warn("[music] Reaction failed:", e.message);
  }
}

async function fetchData(url) {
  const response = await axios.get(url, {
    timeout: CONFIG.TIMEOUTS.FETCH,
    headers: {
      "User-Agent": getRandomUserAgent(),
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });
  return response.data;
}

async function downloadAudioFile(downloadUrl, filePath) {
  const response = await axios({
    url: downloadUrl,
    method: "GET",
    responseType: "stream",
    timeout: CONFIG.TIMEOUTS.DOWNLOAD,
    headers: {
      "User-Agent": getRandomUserAgent()
    }
  });

  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

function sanitizeFileName(name) {
  return name.replace(REGEX.SANITIZE, "_");
}

function formatSongList(songs, limit) {
  let output = "";
  const maxLimit = limit || songs.length;
  songs.slice(0, maxLimit).forEach((song, index) => {
    output += `${index + 1}. ${song.name} - ${song.artist || "Unknown"}\n`;
  });
  return output;
}

function buildListMessage(title, songs, query, limit) {
  let message = `${title} "${query}":\n\n`;
  message += formatSongList(songs, limit);
  message += `\n${OUTPUTS.REPLY_DOWNLOAD}`;
  return message;
}

async function handleDiscover() {
  const data = await fetchData(`${CONFIG.API_BASE}${ENDPOINTS.DISCOVER}`);
  const songs = data.trending_songs || [];
  if (!songs.length) return null;
  return buildListMessage("Trending Now", songs, "trending", CONFIG.LIMITS.TRENDING_LIMIT);
}

async function handleAlbum(albumId) {
  if (!albumId) return null;
  const songs = await fetchData(`${CONFIG.API_BASE}${ENDPOINTS.ALBUM}/${albumId}`);
  if (!songs || !songs.length) return null;
  return buildListMessage("Album Tracks", songs, "album", 15);
}

async function handlePlaylist(playlistId) {
  if (!playlistId) return null;
  const songs = await fetchData(`${CONFIG.API_BASE}${ENDPOINTS.PLAYLIST}/${playlistId}`);
  if (!songs || !songs.length) return null;
  return buildListMessage("Playlist Tracks", songs, "playlist", 15);
}

async function handleArtist(artistId) {
  if (!artistId) return null;
  const data = await fetchData(`${CONFIG.API_BASE}${ENDPOINTS.ARTIST}/${artistId}`);
  if (!data) return null;

  let message = `${data.name}\n\n`;
  message += `Followers: ${data.follower_count || "N/A"}\n`;
  message += `${data.bio || "No bio available"}\n\n`;

  const songs = data.top_songs || [];
  if (songs.length) {
    message += "Top Songs\n";
    message += formatSongList(songs, 10);
  }
  return message;
}

async function handleLyrics(artist, title) {
  if (!artist || !title) return null;
  const data = await fetchData(
    `${CONFIG.API_BASE}${ENDPOINTS.LYRICS}?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`
  );
  if (!data || !data.lyrics) return null;
  return `${title} - ${artist}\n\n${data.lyrics.slice(0, CONFIG.LIMITS.LYRICS_MAX)}`;
}

async function handleRecommend(trackId) {
  if (!trackId) return null;
  const songs = await fetchData(`${CONFIG.API_BASE}${ENDPOINTS.RECOMMEND}/${trackId}`);
  if (!songs || !songs.length) return null;
  return buildListMessage("Recommended", songs, "track", CONFIG.LIMITS.TRENDING_LIMIT);
}

async function handleSearch(query) {
  if (!query) return null;
  const songs = await fetchData(`${CONFIG.API_BASE}${ENDPOINTS.SEARCH}?query=${encodeURIComponent(query)}`);
  if (!songs || !songs.length) return null;
  return songs;
}

async function downloadSong(song, message) {
  const downloadUrl = `${CONFIG.API_BASE}${ENDPOINTS.DOWNLOAD}/${song.id}`;
  const fileName = `${sanitizeFileName(song.name)}.mp3`;
  const filePath = path.join(CONFIG.CACHE_DIR, fileName);

  await fs.ensureDir(CONFIG.CACHE_DIR);
  await downloadAudioFile(downloadUrl, filePath);

  await message.reply({
    body: `${song.name} - ${song.artist || "Unknown"}`,
    attachment: fs.createReadStream(filePath)
  });

  setTimeout(() => {
    fs.unlink(filePath).catch(() => {});
  }, CONFIG.LIMITS.CLEANUP_DELAY);
}

module.exports = {
  config: {
    name: "music",
    aliases: [],
    version: "8.0.0",
    author: "raihan07",
    countDown: 5,
    role: 0,
    shortDescription: "Search, download, discover music",
    longDescription: "YouTube music downloader with raihan07-musicapi",
    category: "media",
    guide: {
      en: [
        "{pn} <song name> - Search and download",
        "{pn} discover - Get trending songs",
        "{pn} album <album_id> - Get album tracks",
        "{pn} playlist <playlist_id> - Get playlist tracks",
        "{pn} artist <artist_id> - Get artist details",
        "{pn} lyrics <artist> - <title> - Get lyrics",
        "{pn} recommend <track_id> - Get recommendations"
      ].join("\n")
    }
  },

  onStart: async function ({ message, args, event, api }) {
    const subCommand = args[0]?.toLowerCase();
    const query = args.slice(1).join(" ").trim();

    try {
      let response = null;

      if (subCommand === COMMANDS.DISCOVER) {
        response = await handleDiscover();
        if (!response) return message.reply(OUTPUTS.NO_TRENDING);
        return message.reply(response);
      }

      if (subCommand === COMMANDS.ALBUM) {
        response = await handleAlbum(query);
        if (!response) return message.reply(OUTPUTS.NO_TRACKS);
        return message.reply(response);
      }

      if (subCommand === COMMANDS.PLAYLIST) {
        response = await handlePlaylist(query);
        if (!response) return message.reply(OUTPUTS.NO_TRACKS);
        return message.reply(response);
      }

      if (subCommand === COMMANDS.ARTIST) {
        response = await handleArtist(query);
        if (!response) return message.reply(OUTPUTS.ARTIST_NOT_FOUND);
        return message.reply(response);
      }

      if (subCommand === COMMANDS.LYRICS) {
        const parts = query.split(REGEX.SPLIT_ARTIST);
        if (parts.length < 2) {
          return message.reply(OUTPUTS.LYRICS_FORMAT);
        }
        response = await handleLyrics(parts[0], parts.slice(1).join(" - "));
        if (!response) return message.reply(OUTPUTS.LYRICS_NOT_FOUND);
        return message.reply(response);
      }

      if (subCommand === COMMANDS.RECOMMEND) {
        response = await handleRecommend(query);
        if (!response) return message.reply(OUTPUTS.NO_RECOMMENDATIONS);
        return message.reply(response);
      }

      const searchQuery = args.join(" ").trim();
      if (!searchQuery) {
        return message.reply(OUTPUTS.HELP);
      }

      setReaction(api, event.messageID, REACTIONS.SEARCHING);

      const editMsg = await message.reply(`${OUTPUTS.SEARCHING} "${searchQuery}"...`);

      const songs = await handleSearch(searchQuery);

      if (!songs) {
        setReaction(api, event.messageID, REACTIONS.FAILED);
        await api.editMessage(`${OUTPUTS.NO_SONGS}`, editMsg.messageID);
        return;
      }

      if (songs.length > 1) {
        const listMessage = buildListMessage(OUTPUTS.FOUND, songs, searchQuery, CONFIG.LIMITS.SONG_LIST);
        await api.editMessage(listMessage, editMsg.messageID);
        setReaction(api, event.messageID, REACTIONS.SUCCESS);

        global.GoatBot.onReply.set(editMsg.messageID, {
          commandName: "music",
          author: event.senderID,
          songs: songs,
          editMsgID: editMsg.messageID
        });
        return;
      }

      await downloadSong(songs[0], message);
      setReaction(api, event.messageID, REACTIONS.SUCCESS);

    } catch (error) {
      console.error("[music]", error);
      setReaction(api, event.messageID, REACTIONS.FAILED);
      return message.reply(`${REACTIONS.FAILED} ${OUTPUTS.API_ERROR}`);
    }
  },

  onReply: async function ({ event, message, Reply, api }) {
    try {
      if (String(event.senderID) !== String(Reply.author)) return;
      if (!Reply.songs) return;

      const input = event.body.trim();
      if (!REGEX.VALID_NUMBER.test(input)) {
        return message.reply(`${OUTPUTS.INVALID_SELECTION}.`);
      }

      const index = parseInt(input, 10) - 1;
      if (index < 0 || index >= Reply.songs.length) {
        return message.reply(`${OUTPUTS.INVALID_SELECTION}.`);
      }

      const selectedSong = Reply.songs[index];

      try {
        await api.unsendMessage(Reply.editMsgID);
      } catch (e) {}

      setReaction(api, event.messageID, REACTIONS.DOWNLOADING);

      await downloadSong(selectedSong, message);

      setReaction(api, event.messageID, REACTIONS.SUCCESS);

    } catch (error) {
      console.error("[music onReply]", error);
      setReaction(api, event.messageID, REACTIONS.FAILED);
      return message.reply(`${REACTIONS.FAILED} ${OUTPUTS.API_ERROR}`);
    }
  }
};