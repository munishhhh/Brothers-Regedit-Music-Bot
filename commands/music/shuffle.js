const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shuffle")
        .setDescription("Shuffle the current queue"),

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

        if (player.queue.length < 2) {
            return interaction.reply({
                embeds: [errorEmbed("Can't Shuffle", "Need at least 2 tracks in the queue to shuffle.")],
                ephemeral: true,
            });
        }

        player.queue.shuffle();

        await interaction.reply({
            embeds: [successEmbed(
                "Shuffled 🔀",
                `Shuffled **${player.queue.length}** tracks in the queue.`
            )],
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player || player.queue.length < 2) {
            return message.reply({ embeds: [errorEmbed("Can't Shuffle", "Not enough tracks.")] });
        }
        player.queue.shuffle();
        message.reply({ embeds: [successEmbed("Shuffled 🔀", `Shuffled **${player.queue.length}** tracks.`)] });
    },
};
