const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");
const logger = require("../utils/logger");

/**
 * Recursively load all commands from the commands directory.
 * @param {import("discord.js").Client} client
 */
function loadCommands(client) {
    client.commands = new Collection();
    const commandsDir = path.join(__dirname, "../../commands");

    if (!fs.existsSync(commandsDir)) {
        logger.warn("Commands directory not found!");
        return;
    }

    const categories = fs.readdirSync(commandsDir);

    for (const category of categories) {
        const categoryPath = path.join(commandsDir, category);
        const stat = fs.statSync(categoryPath);

        if (stat.isDirectory()) {
            // Category subdirectory (e.g., commands/music/, commands/utility/)
            const files = fs.readdirSync(categoryPath).filter(f => f.endsWith(".js"));

            for (const file of files) {
                loadCommand(client, path.join(categoryPath, file), category);
            }
        } else if (category.endsWith(".js")) {
            // Root-level command file
            loadCommand(client, categoryPath, "general");
        }
    }

    logger.success(`Loaded ${client.commands.size} commands`);
}

/**
 * Load a single command file.
 */
function loadCommand(client, filePath, category) {
    try {
        // Clear require cache for hot-reloading
        delete require.cache[require.resolve(filePath)];

        const command = require(filePath);

        if (!command.data || !command.execute) {
            logger.warn(`Command at ${filePath} missing 'data' or 'execute'`);
            return;
        }

        command.category = category;
        client.commands.set(command.data.name, command);

        if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => client.commands.set(alias, command));
        }

        logger.debug(`  └─ Loaded: /${command.data.name} [${category}]`);
    } catch (err) {
        logger.error(`Failed to load command: ${filePath}`, err.message);
    }
}

module.exports = { loadCommands };
