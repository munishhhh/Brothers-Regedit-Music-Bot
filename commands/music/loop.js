const { SlashCommandBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("loop")
        .setDescription("Set the loop mode")
        .addStringOption(option =>
            option
                .setName("mode")
                .setDescription("Loop mode to set")
                .addChoices(
                    { name: "🚫 Off", value: "none" },
                    { name: "🔂 Track", value: "track" },
                    { name: "🔁 Queue", value: "queue" }
                )
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

        let mode = interaction.options.getString("mode");

        // If no mode specified, cycle through: none → track → queue → none
        if (!mode) {
            const modes = ["none", "track", "queue"];
            const currentIndex = modes.indexOf(player.loop || "none");
            mode = modes[(currentIndex + 1) % modes.length];
        }

        player.setLoop(mode);

        const labels = {
            none: "🚫 Loop Off",
            track: "🔂 Looping Current Track",
            queue: "🔁 Looping Entire Queue",
        };

        const descriptions = {
            none: "Playback will continue normally.",
            track: `**${player.queue.current.title}** will repeat.`,
            queue: "The entire queue will repeat when finished.",
        };

        await interaction.reply({
            embeds: [successEmbed(labels[mode], descriptions[mode])],
        });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [errorEmbed("Nothing Playing", "There's nothing playing right now.")] });
        }

        const modes = ["none", "track", "queue"];
        let mode = args[0]?.toLowerCase();

        if (!mode || !modes.includes(mode)) {
            const currentIndex = modes.indexOf(player.loop || "none");
            mode = modes[(currentIndex + 1) % modes.length];
        }

        player.setLoop(mode);
        const labels = { none: "🚫 Loop Off", track: "🔂 Looping Track", queue: "🔁 Looping Queue" };
        message.reply({ embeds: [successEmbed(labels[mode])] });
    },
};
