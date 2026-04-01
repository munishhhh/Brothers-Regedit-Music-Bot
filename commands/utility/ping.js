const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check bot latency and Lavalink node status"),

    async execute(interaction, client) {
        const sent = await interaction.deferReply({ fetchReply: true });
        const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = client.ws.ping;

        // Lavalink node info
        let lavalinkStatus = "❌ Disconnected";
        let lavalinkPlayers = 0;
        let lavalinkUptime = "N/A";
        let lavalinkMemory = "N/A";

        try {
            const nodes = [...client.manager.shoukaku.nodes.values()];
            if (nodes.length > 0 && nodes[0].stats) {
                const node = nodes[0];
                const stats = node.stats;
                lavalinkStatus = "✅ Connected";
                lavalinkPlayers = stats.playingPlayers || 0;

                // Format uptime
                const uptimeMs = stats.uptime || 0;
                const hours = Math.floor(uptimeMs / 3600000);
                const minutes = Math.floor((uptimeMs % 3600000) / 60000);
                lavalinkUptime = `${hours}h ${minutes}m`;

                // Format memory
                const usedMB = Math.round((stats.memory?.used || 0) / 1024 / 1024);
                const allocMB = Math.round((stats.memory?.allocated || 0) / 1024 / 1024);
                lavalinkMemory = `${usedMB}MB / ${allocMB}MB`;
            }
        } catch {
            // Ignore errors — show disconnected
        }

        const embed = new EmbedBuilder()
            .setColor(config.colors.main)
            .setAuthor({ name: "🏓 Pong!" })
            .addFields(
                {
                    name: "📡 Bot Latency",
                    value: `\`${roundTrip}ms\``,
                    inline: true,
                },
                {
                    name: "💓 WebSocket",
                    value: `\`${wsLatency}ms\``,
                    inline: true,
                },
                {
                    name: "🎵 Lavalink",
                    value: lavalinkStatus,
                    inline: true,
                },
                {
                    name: "🔊 Active Players",
                    value: `\`${lavalinkPlayers}\``,
                    inline: true,
                },
                {
                    name: "⏱️ Node Uptime",
                    value: `\`${lavalinkUptime}\``,
                    inline: true,
                },
                {
                    name: "💾 Memory",
                    value: `\`${lavalinkMemory}\``,
                    inline: true,
                }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async prefixExecute(message, args, client) {
        const fakeInteraction = {
            createdTimestamp: message.createdTimestamp,
            deferReply: async (opts) => {
                const sent = await message.reply("🏓 Pinging...");
                return sent;
            },
            editReply: (data) => message.channel.send(data),
        };

        // Simplified for prefix
        const wsLatency = client.ws.ping;
        const embed = new EmbedBuilder()
            .setColor(config.colors.main)
            .setDescription(`🏓 **Pong!** WebSocket: \`${wsLatency}ms\``)
            .setTimestamp();

        message.reply({ embeds: [embed] });
    },
};
