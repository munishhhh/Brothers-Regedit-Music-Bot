const { ActivityType } = require("discord.js");
const logger = require("../../src/utils/logger");

module.exports = {
    name: "ready",
    once: true,

    execute(client) {
        logger.divider();
        logger.success(`Logged in as ${client.user.tag}`);
        logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
        logger.info(`Loaded ${client.commands.size} command(s)`);
        logger.divider();

        const activities = [
            { name: "Dolby Atmos Music 🔊", type: ActivityType.Streaming, url: "https://discord.gg/dRGJ2PYqAU" },
            { name: "24/7 Lo-Fi Radio ☕", type: ActivityType.Streaming, url: "https://discord.gg/dRGJ2PYqAU" },
            { name: "with /mood & /random 🎲", type: ActivityType.Streaming, url: "https://discord.gg/dRGJ2PYqAU" },
            { name: "Over ${guilds} Servers 🌐", type: ActivityType.Streaming, url: "https://discord.gg/dRGJ2PYqAU" },
            { name: "Ultra-Low Latency Audio 🚀", type: ActivityType.Streaming, url: "https://discord.gg/dRGJ2PYqAU" }
        ];

        let i = 0;
        const updateActivity = () => {
            // Allow dynamic override set by the /status command
            if (client.customStatusOverride) {
                client.user.setActivity(client.customStatusOverride.name, {
                    type: client.customStatusOverride.type
                });
                return;
            }

            const current = activities[i];
            const processedName = current.name.replace("${guilds}", client.guilds.cache.size);
            
            client.user.setActivity(processedName, {
                type: current.type,
                url: current.url || undefined
            });

            i = (i + 1) % activities.length;
        };

        updateActivity();
        setInterval(updateActivity, 15000); // Rotate every 15 seconds
    },
};
