const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pause")
        .setDescription("Pause the current track"),

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

        if (player.paused) {
            return interaction.reply({
                embeds: [errorEmbed("Already Paused", "The player is already paused. Use `/resume` to continue.")],
                ephemeral: true,
            });
        }

        player.pause(true);

        await interaction.reply({
            embeds: [successEmbed("Paused ⏸️", `Paused **${player.queue.current.title}**`)],
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [errorEmbed("Nothing Playing", "There's nothing playing right now.")] });
        }
        player.pause(true);
        message.reply({ embeds: [successEmbed("Paused ⏸️", `Paused **${player.queue.current.title}**`)] });
    },
};
