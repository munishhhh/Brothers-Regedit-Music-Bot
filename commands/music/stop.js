const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stop")
        .setDescription("Stop playback, clear the queue, and disconnect"),

    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guildId);

        if (!player) {
            return interaction.reply({
                embeds: [errorEmbed("No Player", "There's nothing playing right now.")],
                ephemeral: true,
            });
        }

        if (!interaction.member.voice.channel || interaction.member.voice.channel.id !== player.voiceId) {
            return interaction.reply({
                embeds: [errorEmbed("Not in Voice", "You need to be in the same voice channel.")],
                ephemeral: true,
            });
        }

        const queueLength = player.queue.length;
        player.queue.clear();
        player.destroy();

        await interaction.reply({
            embeds: [successEmbed(
                "Stopped ⏹️",
                `Cleared **${queueLength}** track${queueLength !== 1 ? "s" : ""} and disconnected.`
            )],
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ embeds: [errorEmbed("No Player", "There's nothing playing right now.")] });
        }
        const len = player.queue.length;
        player.queue.clear();
        player.destroy();
        message.reply({ embeds: [successEmbed("Stopped ⏹️", `Cleared **${len}** tracks and disconnected.`)] });
    },
};
