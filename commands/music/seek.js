const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");
const { formatDuration, parseTimeString } = require("../../src/utils/formatDuration");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("seek")
        .setDescription("Seek to a specific position in the current track")
        .addStringOption(option =>
            option
                .setName("time")
                .setDescription("Time to seek to (e.g., 1:30, 90, 1:02:30)")
                .setRequired(true)
        ),

    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guildId);

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed("Nothing Playing", "There's nothing playing right now.")],
                ephemeral: true,
            });
        }

        if (!interaction.member.voice.channel || interaction.member.voice.channel.id !== player.voiceId) {
            return interaction.reply({
                embeds: [errorEmbed("Not in Voice", "You need to be in the same voice channel.")],
                ephemeral: true,
            });
        }

        if (player.queue.current.isStream) {
            return interaction.reply({
                embeds: [errorEmbed("Can't Seek", "You can't seek in a live stream.")],
                ephemeral: true,
            });
        }

        const timeStr = interaction.options.getString("time");
        const position = parseTimeString(timeStr);

        if (position <= 0) {
            return interaction.reply({
                embeds: [errorEmbed("Invalid Time", "Please provide a valid time format (e.g., `1:30`, `90`, `1:02:30`).")],
                ephemeral: true,
            });
        }

        const duration = player.queue.current.length;
        if (position > duration) {
            return interaction.reply({
                embeds: [errorEmbed(
                    "Invalid Position",
                    `The track is only **${formatDuration(duration)}** long.`
                )],
                ephemeral: true,
            });
        }

        player.seekTo(position);

        await interaction.reply({
            embeds: [successEmbed(
                "Seeked ⏩",
                `Jumped to **${formatDuration(position)}** / ${formatDuration(duration)}`
            )],
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [errorEmbed("Nothing Playing", "There's nothing playing.")] });
        }

        const position = parseTimeString(args[0]);
        if (position <= 0) {
            return message.reply({ embeds: [errorEmbed("Invalid Time", "Usage: `!seek 1:30`")] });
        }

        player.seekTo(position);
        message.reply({ embeds: [successEmbed("Seeked ⏩", `Jumped to **${formatDuration(position)}**`)] });
    },
};
