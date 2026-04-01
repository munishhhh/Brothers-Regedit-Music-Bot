const { SlashCommandBuilder } = require("discord.js");
const { errorEmbed, successEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    aliases: ["24/7", "radio"],
    data: new SlashCommandBuilder()
        .setName("247")
        .setDescription("Toggle 24/7 Radio mode to keep the bot in the voice channel permanently"),

    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        if (!player) {
            return interaction.reply({
                embeds: [errorEmbed("No Player", "The bot is not currently in a voice channel. Play a song first!")],
                ephemeral: true
            });
        }

        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceId) {
            return interaction.reply({
                embeds: [errorEmbed("Not in Voice", "You must be in the bot's voice channel to toggle 24/7 mode.")],
                ephemeral: true
            });
        }

        const current247 = player.data.get("247");
        player.data.set("247", !current247);

        // If disabling 24/7 and the channel is already empty, queue disconnect timeout
        if (current247) {
            const currentChannel = client.channels.cache.get(player.voiceId);
            if (currentChannel && currentChannel.members.filter(m => !m.user.bot).size === 0) {
                // If everyone left while 24/7 was active but now it's off, manually destroy to be safe
                player.destroy();
                return interaction.reply({
                    embeds: [successEmbed("24/7 Mode Disabled", "The radio has been turned off. Disconnecting since channel is empty.")]
                });
            }
        }

        return interaction.reply({
            embeds: [successEmbed(
                `24/7 Mode ${!current247 ? "Enabled 🟢" : "Disabled 🔴"}`,
                !current247 
                    ? "The bot will now stay in this voice channel permanently acting as a radio."
                    : "The bot will resume disconnecting automatically when the channel is empty."
            )]
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) return message.reply("The bot is not currently in a voice channel.");

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== player.voiceId) return message.reply("You must be in the same voice channel to toggle this.");

        const current247 = player.data.get("247");
        player.data.set("247", !current247);
        
        return message.reply({ embeds: [successEmbed(
            `24/7 Mode ${!current247 ? "Enabled 🟢" : "Disabled 🔴"}`,
            !current247 
                ? "The bot will now stay in this voice channel permanently acting as a radio."
                : "The bot will resume disconnecting automatically when the channel is empty."
        )]});
    }
};
