const { SlashCommandBuilder } = require("discord.js");
const { nowPlayingEmbed, playerButtons, errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nowplaying")
        .setDescription("Show details about the currently playing track"),

    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guildId);

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed("Nothing Playing", "There's nothing playing right now. Use `/play` to start!")],
                ephemeral: true,
            });
        }

        const embed = nowPlayingEmbed(player.queue.current, player);
        const buttons = playerButtons(player);

        await interaction.reply({
            embeds: [embed],
            components: buttons,
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [errorEmbed("Nothing Playing", "There's nothing playing right now.")] });
        }

        const embed = nowPlayingEmbed(player.queue.current, player);
        const buttons = playerButtons(player);
        message.reply({ embeds: [embed], components: buttons });
    },
};
