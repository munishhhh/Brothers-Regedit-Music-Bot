require("dotenv").config();

const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

// ── Configuration ───────────────────────────────────
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const isGlobal = process.argv.includes("--global");

if (!TOKEN || !CLIENT_ID) {
    console.error("❌ Missing TOKEN or CLIENT_ID in .env file!");
    process.exit(1);
}

// ── Collect Commands ────────────────────────────────
const commands = [];
const commandsDir = path.join(__dirname, "commands");

function loadCommandsRecursive(dir) {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            loadCommandsRecursive(fullPath);
        } else if (entry.endsWith(".js")) {
            try {
                const command = require(fullPath);
                if (command.data && typeof command.data.toJSON === "function") {
                    commands.push(command.data.toJSON());
                    console.log(`  ✓ ${command.data.name}`);
                }
            } catch (err) {
                console.error(`  ✗ Failed to load ${entry}:`, err.message);
            }
        }
    }
}

console.log("\n📦 Loading commands...\n");
loadCommandsRecursive(commandsDir);

// ── Deploy ──────────────────────────────────────────
const rest = new REST().setToken(TOKEN);

(async () => {
    try {
        console.log(`\n🚀 Deploying ${commands.length} commands ${isGlobal ? "globally" : `to guild ${GUILD_ID}`}...\n`);

        if (isGlobal) {
            // Global deployment (takes up to 1 hour to propagate)
            const data = await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ Successfully deployed ${data.length} global commands!`);
        } else {
            // Guild deployment (instant)
            if (!GUILD_ID) {
                console.error("❌ Missing GUILD_ID in .env for guild deployment!");
                console.log("💡 Use --global flag for global deployment, or add GUILD_ID to .env");
                process.exit(1);
            }

            const data = await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            );
            console.log(`✅ Successfully deployed ${data.length} commands to guild ${GUILD_ID}!`);
        }

        console.log("\n💡 Tips:");
        console.log("   • Guild commands update instantly");
        console.log("   • Global commands take up to 1 hour to propagate");
        console.log("   • Run with --global for production deployment\n");
    } catch (err) {
        console.error("❌ Deployment failed:", err);
    }
})();
