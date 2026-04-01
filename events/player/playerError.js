const logger = require("../../src/utils/logger");
const { errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    name: "playerError",

    async execute(client, player, error = { message: "Unknown error" }) {
        logger.error(`Player error [${player.guildId}]:`, error?.message || error);

        const channel = client.channels.cache.get(player.textId);

        if (channel) {
            const currentTrack = player.queue.current;
            const trackInfo = currentTrack ? ` while playing **${currentTrack.title}**` : "";

            channel.send({
                embeds: [errorEmbed(
                    "Playback Error",
                    `An error occurred${trackInfo}.\nSkipping to the next track...`
                )],
            }).catch(() => {});
        }

        // Try to skip to the next track gracefully
        try {
            if (player.queue.length > 0) {
                player.skip();
            }
        } catch (err) {
            logger.error("Failed to skip after error:", err.message);
        }
    },
};
