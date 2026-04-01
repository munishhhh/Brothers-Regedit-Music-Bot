const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("autoplay")
        .setDescription("Toggle autoplay — automatically plays related tracks when the queue ends"),

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

        // Toggle autoplay state
        if (!player.data) player.data = new Map();
        const current = player.data.get("autoplay") || false;
        player.data.set("autoplay", !current);

        const enabled = !current;

        await interaction.reply({
            embeds: [successEmbed(
                enabled ? "Autoplay Enabled 🎵" : "Autoplay Disabled",
                enabled
                    ? "When the queue ends, I'll automatically play related tracks."
                    : "Autoplay has been turned off."
            )],
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ embeds: [errorEmbed("Nothing Playing", "There's nothing playing.")] });
        }

        if (!player.data) player.data = new Map();
        const current = player.data.get("autoplay") || false;
        player.data.set("autoplay", !current);

        message.reply({
            embeds: [successEmbed(!current ? "Autoplay Enabled 🎵" : "Autoplay Disabled")],
        });
    },
};
