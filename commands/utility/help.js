const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Show all available commands"),

    async execute(interaction, client) {
        const musicCommands = [
            { name: "/play `<query>`", description: "Play a song or add to queue" },
            { name: "/pause", description: "Pause the current track" },
            { name: "/resume", description: "Resume playback" },
            { name: "/skip", description: "Skip to the next track" },
            { name: "/stop", description: "Stop playback and disconnect" },
            { name: "/queue `[page]`", description: "View the music queue" },
            { name: "/nowplaying", description: "Show current track details" },
            { name: "/shuffle", description: "Shuffle the queue" },
            { name: "/loop `[mode]`", description: "Set loop mode (off/track/queue)" },
            { name: "/remove `<position>`", description: "Remove a track from queue" },
            { name: "/seek `<time>`", description: "Seek to position (e.g. 1:30)" },
            { name: "/volume `[level]`", description: "Set or view volume (0-150)" },
            { name: "/autoplay", description: "Toggle autoplay for related tracks" },
            { name: "/filter `<preset>`", description: "Apply audio filter (bassboost, nightcore, etc.)" },
        ];

        const utilityCommands = [
            { name: "/help", description: "Show this help menu" },
            { name: "/ping", description: "Check bot and Lavalink latency" },
        ];

        const embed = new EmbedBuilder()
            .setColor(config.colors.main)
            .setAuthor({
                name: "Brothers Regedit Music Bot",
                iconURL: client.user.displayAvatarURL(),
            })
            .setDescription(
                "A feature-rich music bot powered by **Lavalink** 🎧\n" +
                "Use slash commands or prefix commands (`!`).\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━━━━━"
            )
            .addFields(
                {
                    name: "🎵 Music Commands",
                    value: musicCommands
                        .map(c => `> ${c.name}\n> *${c.description}*`)
                        .join("\n\n"),
                },
                {
                    name: "\u200B",
                    value: "━━━━━━━━━━━━━━━━━━━━━━━━━━",
                },
                {
                    name: "⚙️ Utility Commands",
                    value: utilityCommands
                        .map(c => `> ${c.name}\n> *${c.description}*`)
                        .join("\n\n"),
                },
                {
                    name: "\u200B",
                    value: "━━━━━━━━━━━━━━━━━━━━━━━━━━",
                },
                {
                    name: "🎛️ Audio Filters",
                    value: "> `bassboost` • `nightcore` • `vaporwave` • `8d`\n> `karaoke` • `tremolo` • `vibrato` • `pop` • `soft`",
                },
                {
                    name: "🔗 Supported Sources",
                    value: "> YouTube • Spotify • Direct URLs",
                }
            )
            .setFooter({
                text: `${client.guilds.cache.size} servers • ${client.users.cache.size} users`,
                iconURL: client.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async prefixExecute(message, args, client) {
        // Reuse slash command logic
        const fakeInteraction = {
            reply: (data) => message.reply(data),
            user: message.author,
        };
        await module.exports.execute(fakeInteraction, client);
    },
};
