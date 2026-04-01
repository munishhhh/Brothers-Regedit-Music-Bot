const logger = require("../../src/utils/logger");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");
const config = require("../../config");

module.exports = {
    name: "playerEnd",

    async execute(client, player) {
        logger.music(`Track ended [${player.guildId}]`);

        const channel = client.channels.cache.get(player.textId);

        // If autoplay is enabled and queue is empty, try to find a related track
        if (player.data?.get("autoplay") && player.queue.length === 0) {
            const lastTrack = player.queue.previous;

            if (lastTrack) {
                try {
                    logger.music(`Autoplay: searching related tracks for "${lastTrack.title}"`);

                    // Search for related content
                    const query = `${lastTrack.title} ${lastTrack.author}`;
                    const result = await client.manager.search(query, {
                        requester: lastTrack.requester,
                        engine: "youtube",
                    });

                    if (result.tracks.length > 0) {
                        // Pick a track that's different from the last one
                        const playedUris = player.data?.get("playedUris") || new Set();
                        const nextTrack = result.tracks.find(t => !playedUris.has(t.uri)) || result.tracks[0];

                        // Track played URIs (keep last 20 to avoid infinite loops)
                        if (!player.data) player.data = new Map();
                        playedUris.add(nextTrack.uri);
                        if (playedUris.size > 20) {
                            const first = playedUris.values().next().value;
                            playedUris.delete(first);
                        }
                        player.data.set("playedUris", playedUris);

                        player.queue.add(nextTrack);

                        if (!player.playing && !player.paused) {
                            player.play();
                        }

                        if (channel) {
                            channel.send({
                                embeds: [successEmbed(
                                    "Autoplay 🎵",
                                    `Added **${nextTrack.title}** via autoplay`
                                )],
                            }).catch(() => {});
                        }

                        return;
                    }
                } catch (err) {
                    logger.error("Autoplay error:", err.message);
                }
            }
        }

        // Queue is empty and no autoplay — notify and set disconnect timer
        if (player.queue.length === 0 && !player.playing) {
            // Disable buttons on the last now-playing message
            const prevMsg = player.data?.get("nowPlayingMessage");
            if (prevMsg) {
                await prevMsg.edit({ components: [] }).catch(() => {});
            }

            if (channel) {
                channel.send({
                    embeds: [successEmbed(
                        "Queue Ended",
                        "No more tracks in the queue. Use `/play` to add more!\n*I'll leave the voice channel in 30 seconds if idle.*"
                    )],
                }).catch(() => {});
            }

            // Auto-disconnect after timeout
            const timeout = setTimeout(() => {
                if (player.queue.length === 0 && !player.playing) {
                    player.destroy();
                    if (channel) {
                        channel.send({
                            embeds: [successEmbed("Disconnected", "Left the voice channel due to inactivity.")],
                        }).catch(() => {});
                    }
                    logger.music(`Auto-disconnected from guild ${player.guildId}`);
                }
            }, config.player.disconnectTimeout);

            if (!player.data) player.data = new Map();
            player.data.set("disconnectTimeout", timeout);
        }
    },
};
