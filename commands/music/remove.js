const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");
const { formatDuration } = require("../../src/utils/formatDuration");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove a track from the queue by position")
        .addIntegerOption(option =>
            option
                .setName("position")
                .setDescription("Position of the track to remove (1 = first in queue)")
                .setRequired(true)
                .setMinValue(1)
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

        const position = interaction.options.getInteger("position");

        if (position > player.queue.length) {
            return interaction.reply({
                embeds: [errorEmbed(
                    "Invalid Position",
                    `The queue only has **${player.queue.length}** track${player.queue.length !== 1 ? "s" : ""}. Use \`/queue\` to see positions.`
                )],
                ephemeral: true,
            });
        }

        const removed = player.queue.splice(position - 1, 1);
        const track = removed[0];

        await interaction.reply({
            embeds: [successEmbed(
                "Removed from Queue",
                `Removed **${track?.title || "Unknown"}** (${formatDuration(track?.length)}) from position #${position}`
            )],
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ embeds: [errorEmbed("Nothing Playing", "There's nothing playing.")] });
        }

        const pos = parseInt(args[0]);
        if (isNaN(pos) || pos < 1 || pos > player.queue.length) {
            return message.reply({ embeds: [errorEmbed("Invalid Position", `Usage: \`!remove <1-${player.queue.length}>\``)] });
        }

        const removed = player.queue.splice(pos - 1, 1);
        message.reply({ embeds: [successEmbed("Removed", `Removed **${removed[0]?.title || "Unknown"}**`)] });
    },
};
