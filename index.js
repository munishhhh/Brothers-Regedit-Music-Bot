require("dotenv").config();

const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const { Kazagumo, Plugins } = require("kazagumo");
const { Connectors } = require("shoukaku");
const config = require("./config");
const logger = require("./src/utils/logger");
const { loadCommands } = require("./src/handlers/commandHandler");
const { loadEvents } = require("./src/handlers/eventHandler");

// ── Validate Token ──────────────────────────────────
if (!process.env.TOKEN) {
    logger.error("Missing TOKEN in .env file!");
    process.exit(1);
}

// ── Show Banner ─────────────────────────────────────
logger.banner();
logger.divider();

// ── Create Discord Client ───────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    allowedMentions: { parse: ["users", "roles"], repliedUser: false },
});

// ── Store config on client for easy access ──────────
client.config = config;

// ── Initialize Kazagumo (Lavalink Manager) ──────────
const kazagumoOptions = {
    defaultSearchEngine: config.player.defaultSearchEngine,
    send: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
    },
};

// Add Spotify plugin if credentials are configured
const plugins = [];
// Note: Spotify resolution is handled by LavaSrc on the Lavalink server side.
// Kazagumo will pass spotify: URLs to Lavalink which resolves them.

const manager = new Kazagumo(kazagumoOptions, new Connectors.DiscordJS(client), config.nodes, {
    resume: true,
    resumeTimeout: 30,
    resumeByLibrary: true,
    reconnectTries: 5,
    reconnectInterval: 5000,
    restTimeout: 60000,
    moveOnDisconnect: false,
    userAgent: "Brothers-Regedit-Music-Bot/1.0",
});

// Attach manager to client
client.manager = manager;

const { setupKeyboardListener } = require("./src/utils/keyboardController");

// ── Shoukaku / Lavalink Connection Events ───────────
manager.shoukaku.on("ready", (name) => {
    logger.success(`Lavalink node connected: ${name}`);
    setupKeyboardListener(client);
});

manager.shoukaku.on("error", (name, error) => {
    logger.error(`Lavalink node "${name}" error:`, error.message);
});

manager.shoukaku.on("close", (name, code, reason) => {
    logger.warn(`Lavalink node "${name}" closed: [${code}] ${reason || "No reason"}`);
});

manager.shoukaku.on("disconnect", (name, players, moved) => {
    if (moved) return;
    logger.warn(`Lavalink node "${name}" disconnected. ${players.size} players affected.`);
    // Attempt to move players to another node
    players.forEach((player) => {
        try {
            player.move();
        } catch {
            player.destroy();
        }
    });
});

manager.shoukaku.on("reconnecting", (name, info, tries) => {
    logger.info(`Reconnecting to node "${name}" — attempt ${tries}...`);
});

// ── Load Commands & Events ──────────────────────────
logger.info("Loading commands...");
loadCommands(client);

logger.info("Loading events...");
loadEvents(client);

// ── Prefix Command Handler (Legacy Support) ─────────
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild) return;

    // Detect if the message starts with any allowed prefix
    const prefixes = Array.isArray(config.prefix) ? config.prefix : [config.prefix];
    const prefix = prefixes.find(p => message.content.toLowerCase().startsWith(p));

    if (!prefix) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command || !command.prefixExecute) return;

    try {
        await command.prefixExecute(message, args, client);
    } catch (err) {
        logger.error(`Prefix command error (${commandName}):`, err.message);
        message.reply("❌ An error occurred while executing that command.").catch(() => { });
    }
});

// ── Graceful Shutdown ───────────────────────────────
const shutdown = async (signal) => {
    logger.warn(`Received ${signal}. Shutting down gracefully...`);

    // Destroy all players
    for (const [, player] of manager.players) {
        try {
            player.destroy();
        } catch { }
    }

    // Destroy client
    client.destroy();
    process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (err) => {
    logger.error("Unhandled Rejection:", err?.message || err);
});

process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception:", err?.message || err);
});

// ── Voice Debug WAV Auto Cleanup ────────────────────
const fs = require('fs');
const path = require('path');
setInterval(() => {
    const outputsDir = path.join(__dirname, "outputs");
    if (!fs.existsSync(outputsDir)) return;
    
    fs.readdir(outputsDir, (err, files) => {
        if (err) return;
        const now = Date.now();
        files.forEach(file => {
            if (file.endsWith('.wav') || file.endsWith('.pcm')) {
                const filePath = path.join(outputsDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    // Delete debug audio files older than 5 minutes
                    if (now - stats.mtimeMs > 5 * 60 * 1000) {
                        fs.unlink(filePath, () => {
                            logger.info(`[Cleanup] Auto-deleted old voice debug file: ${file}`);
                        });
                    }
                });
            }
        });
    });
}, 5 * 60 * 1000); // Check every 5 minutes

// ── Web Server for 24/7 Hosting (UptimeRobot) ───────
const express = require('express');
const app = express();
const port = process.env.PORT || process.env.SERVER_PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is Alive! Ready for UptimeRobot.');
});

app.listen(port, "0.0.0.0", () => {
    logger.info(`Web server listening on port ${port} (for 24/7 uptime)`);
});

// ── Login ───────────────────────────────────────────
client.login(process.env.TOKEN);