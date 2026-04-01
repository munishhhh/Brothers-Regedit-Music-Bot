const logger = require("../../src/utils/logger");
const { nowPlayingEmbed, playerButtons } = require("../../src/structures/EmbedBuilder");

module.exports = {
    name: "playerStart",

    async execute(client, player, track) {
        logger.music(`Now playing: ${track.title} [${player.guildId}]`);

        const channel = client.channels.cache.get(player.textId);
        if (!channel) return;

        try {
            // Delete previous now-playing message
            const prevMsg = player.data?.get("nowPlayingMessage");
            if (prevMsg) {
                await prevMsg.delete().catch(() => {});
            }

            // Build now-playing embed
            const embed = nowPlayingEmbed(track, player);
            const buttons = playerButtons(player);

            // Send new now-playing message
            const msg = await channel.send({
                embeds: [embed],
                components: buttons,
            });

            // Store the message reference for later updates
            if (!player.data) player.data = new Map();
            player.data.set("nowPlayingMessage", msg);

            if (player.data.has("progressInterval")) {
                clearInterval(player.data.get("progressInterval"));
            }

            if (!track.isStream) {
                const interval = setInterval(async () => {
                    const currentPlayer = client.manager.players.get(player.guildId);
                    
                    if (!currentPlayer || currentPlayer.queue.current?.uri !== track.uri) {
                        clearInterval(interval);
                        return;
                    }
                    
                    if (currentPlayer.paused) return;
                    
                    try {
                        const newEmbed = nowPlayingEmbed(track, currentPlayer);
                        await msg.edit({ embeds: [newEmbed] });
                    } catch (err) {
                        if (err.code === 10008) clearInterval(interval);
                    }
                }, 1_000);

                player.data.set("progressInterval", interval);
            }
        } catch (err) {
            logger.error("Error sending now-playing message:", err.message);
        }
    },
};
