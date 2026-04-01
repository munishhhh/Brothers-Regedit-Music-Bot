const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("resume")
        .setDescription("Resume the paused track"),

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

        if (!player.paused) {
            return interaction.reply({
                embeds: [errorEmbed("Not Paused", "The player is not paused.")],
                ephemeral: true,
            });
        }

        player.pause(false);

        await interaction.reply({
            embeds: [successEmbed("Resumed ▶️", `Resumed **${player.queue.current.title}**`)],
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [errorEmbed("Nothing Playing", "There's nothing playing right now.")] });
        }
        player.pause(false);
        message.reply({ embeds: [successEmbed("Resumed ▶️", `Resumed **${player.queue.current.title}**`)] });
    },
};
