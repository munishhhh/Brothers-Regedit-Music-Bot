const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");
const { createVolumeBar } = require("../../src/utils/progressBar");
const config = require("../../config");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("volume")
        .setDescription("Set the player volume")
        .addIntegerOption(option =>
            option
                .setName("level")
                .setDescription(`Volume level (0-${config.player.maxVolume})`)
                .setMinValue(0)
                .setMaxValue(config.player.maxVolume)
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

        const level = interaction.options.getInteger("level");

        // If no level specified, show current volume
        if (level === null || level === undefined) {
            return interaction.reply({
                embeds: [successEmbed(
                    "Current Volume",
                    createVolumeBar(player.volume)
                )],
            });
        }

        player.setVolume(level);

        await interaction.reply({
            embeds: [successEmbed(
                "Volume Updated",
                createVolumeBar(level)
            )],
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ embeds: [errorEmbed("Nothing Playing", "There's nothing playing.")] });
        }

        const level = parseInt(args[0]);
        if (isNaN(level) || level < 0 || level > config.player.maxVolume) {
            return message.reply({
                embeds: [successEmbed("Current Volume", createVolumeBar(player.volume))],
            });
        }

        player.setVolume(level);
        message.reply({ embeds: [successEmbed("Volume Updated", createVolumeBar(level))] });
    },
};
