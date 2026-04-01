const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

/**
 * Load all events from the events directory.
 * Supports client events (events/client/) and player events (events/player/).
 * @param {import("discord.js").Client} client
 */
function loadEvents(client) {
    const eventsDir = path.join(__dirname, "../../events");

    if (!fs.existsSync(eventsDir)) {
        logger.warn("Events directory not found!");
        return;
    }

    let clientEventCount = 0;
    let playerEventCount = 0;

    // ── Load Client Events ──────────────────────────
    const clientEventsDir = path.join(eventsDir, "client");
    if (fs.existsSync(clientEventsDir)) {
        const files = fs.readdirSync(clientEventsDir).filter(f => f.endsWith(".js"));

        for (const file of files) {
            try {
                delete require.cache[require.resolve(path.join(clientEventsDir, file))];
                const event = require(path.join(clientEventsDir, file));
                const eventName = event.name || file.replace(".js", "");

                if (event.once) {
                    client.once(eventName, (...args) => event.execute(...args, client));
                } else {
                    client.on(eventName, (...args) => event.execute(...args, client));
                }

                clientEventCount++;
                logger.debug(`  └─ Client event: ${eventName}`);
            } catch (err) {
                logger.error(`Failed to load client event: ${file}`, err.message);
            }
        }
    }

    // ── Load Player Events ──────────────────────────
    const playerEventsDir = path.join(eventsDir, "player");
    if (fs.existsSync(playerEventsDir)) {
        const files = fs.readdirSync(playerEventsDir).filter(f => f.endsWith(".js"));

        for (const file of files) {
            try {
                delete require.cache[require.resolve(path.join(playerEventsDir, file))];
                const event = require(path.join(playerEventsDir, file));
                const eventName = event.name || file.replace(".js", "");

                // Player events are bound to the Kazagumo manager
                if (client.manager) {
                    client.manager.on(eventName, (...args) => event.execute(client, ...args));
                    playerEventCount++;
                    logger.debug(`  └─ Player event: ${eventName}`);
                }
            } catch (err) {
                logger.error(`Failed to load player event: ${file}`, err.message);
            }
        }
    }

    logger.success(`Loaded ${clientEventCount} client events, ${playerEventCount} player events`);
}

module.exports = { loadEvents };
