const logger = require("../../src/utils/logger");
const { warningEmbed } = require("../../src/structures/EmbedBuilder");
const config = require("../../config");

module.exports = {
    name: "voiceStateUpdate",
    once: false,

    async execute(oldState, newState, client) {
        // Skip if there's no player for this guild
        const player = client.manager?.players.get(oldState.guild.id);
        if (!player) return;

        // If the bot itself was disconnected
        if (oldState.id === client.user.id && !newState.channelId) {
            player.destroy();
            return;
        }

        // Check if the state update is for the bot's voice channel
        if (oldState.channelId === player.voiceId || newState.channelId === player.voiceId) {
            const voiceChannel = client.channels.cache.get(player.voiceId);
            if (!voiceChannel) return;

            const nonBotMembers = voiceChannel.members.filter(m => !m.user.bot);

            // If everyone left the channel
            if (nonBotMembers.size === 0) {
                if (player.data?.get("247")) return; // BYPASS FOR 24/7 MODE

                const textChannel = client.channels.cache.get(player.textId);

                // Start disconnect timer (default 30 seconds)
                const timeout = setTimeout(() => {
                    const currentChannel = client.channels.cache.get(player.voiceId);
                    if (!currentChannel) return;

                    const currentMembers = currentChannel.members.filter(m => !m.user.bot);
                    if (currentMembers.size === 0) {
                        player.destroy();
                        if (textChannel) {
                            textChannel.send({
                                embeds: [warningEmbed("Disconnected", "Left the voice channel — no one was listening.")]
                            }).catch(() => {});
                        }
                        logger.music(`Auto-disconnected from empty VC [${player.guildId}]`);
                    }
                }, 30_000);

                if (!player.data) player.data = new Map();
                player.data.set("vcEmptyTimeout", timeout);
            } else {
                // Someone joined back, cancel the timeout
                if (player.data?.has("vcEmptyTimeout")) {
                    clearTimeout(player.data.get("vcEmptyTimeout"));
                    player.data.delete("vcEmptyTimeout");
                }
            }
        }
    },
};
