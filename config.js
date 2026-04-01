require("dotenv").config();

module.exports = {
    // ── Bot Settings ────────────────────────────────
    // Accept multiple prefixes separated by comma, fallback to ["!", "+"]
    prefix: process.env.PREFIX ? process.env.PREFIX.split(",") : ["!", "+"],
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    defaultVolume: parseInt(process.env.DEFAULT_VOLUME) || 80,

    // ── Lavalink Nodes ──────────────────────────────
    nodes: [
        {
            name: "Kitsune Public Node",
            url: "lavalink.freelavalink.us:443",
            auth: "https://dsc.gg/freelavalink",
            secure: true,
        },
        {
            name: "Koto Public Node",
            url: "node.kotonodes.xyz:443",
            auth: "kotonodes.xyz",
            secure: true,
        }
    ],

    // ── Spotify (Optional) ──────────────────────────
    spotify: {
        clientId: process.env.SPOTIFY_CLIENT_ID || "",
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
    },

    // ── Embed Colors ────────────────────────────────
    colors: {
        main: 0x5865F2,       // Discord Blurple
        success: 0x2ECC71,    // Green
        error: 0xE74C3C,      // Red
        warning: 0xF39C12,    // Amber
        queue: 0x9B59B6,      // Purple
        nowPlaying: 0xE91E63, // Pink/Magenta
        info: 0x3498DB,       // Blue
    },

    // ── Player Settings ─────────────────────────────
    player: {
        maxQueueSize: 500,
        disconnectTimeout: 30_000,   // 30s after empty VC
        maxVolume: 150,
        defaultSearchEngine: "youtube",
    },

    // ── Emojis ──────────────────────────────────────
    emojis: {
        play: "▶️",
        pause: "⏸️",
        stop: "⏹️",
        skip: "⏭️",
        previous: "⏮️",
        loop: "🔁",
        loopTrack: "🔂",
        shuffle: "🔀",
        volume: "🔊",
        volumeMute: "🔇",
        queue: "📋",
        music: "🎵",
        disc: "💿",
        clock: "⏰",
        error: "❌",
        success: "✅",
        warning: "⚠️",
        loading: "⏳",
        star: "⭐",
        fire: "🔥",
        heart: "❤️",
        link: "🔗",
        search: "🔎",
    }
};