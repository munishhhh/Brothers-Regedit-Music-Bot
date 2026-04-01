const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");
const config = require("../../config");

// ── Filter Presets ──────────────────────────────────
const FILTERS = {
    bassboost: {
        label: "Bass Boost 🔊",
        description: "Enhance low frequencies for powerful bass",
        equalizer: [
            { band: 0, gain: 0.6 },
            { band: 1, gain: 0.5 },
            { band: 2, gain: 0.35 },
            { band: 3, gain: 0.25 },
            { band: 4, gain: 0.15 },
            { band: 5, gain: 0.05 },
            { band: 6, gain: -0.05 },
            { band: 7, gain: -0.1 },
            { band: 8, gain: -0.1 },
            { band: 9, gain: -0.1 },
            { band: 10, gain: -0.1 },
            { band: 11, gain: -0.1 },
            { band: 12, gain: -0.1 },
            { band: 13, gain: -0.1 },
            { band: 14, gain: -0.1 },
        ],
    },
    nightcore: {
        label: "Nightcore 🌙",
        description: "Speed up with higher pitch",
        timescale: { speed: 1.25, pitch: 1.3, rate: 1.0 },
    },
    vaporwave: {
        label: "Vaporwave 🌊",
        description: "Slow down with lower pitch",
        timescale: { speed: 0.85, pitch: 0.8, rate: 1.0 },
    },
    "8d": {
        label: "8D Audio 🎧",
        description: "Rotating audio effect",
        rotation: { rotationHz: 0.2 },
    },
    karaoke: {
        label: "Karaoke 🎤",
        description: "Remove vocals from the track",
        karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 },
    },
    tremolo: {
        label: "Tremolo 〰️",
        description: "Volume oscillation effect",
        tremolo: { frequency: 4.0, depth: 0.75 },
    },
    vibrato: {
        label: "Vibrato 🎵",
        description: "Pitch oscillation effect",
        vibrato: { frequency: 4.0, depth: 0.75 },
    },
    pop: {
        label: "Pop 🎶",
        description: "Optimized for pop music",
        equalizer: [
            { band: 0, gain: -0.1 },
            { band: 1, gain: 0.0 },
            { band: 2, gain: 0.1 },
            { band: 3, gain: 0.2 },
            { band: 4, gain: 0.35 },
            { band: 5, gain: 0.35 },
            { band: 6, gain: 0.2 },
            { band: 7, gain: 0.1 },
            { band: 8, gain: 0.0 },
            { band: 9, gain: -0.05 },
            { band: 10, gain: -0.1 },
            { band: 11, gain: -0.1 },
            { band: 12, gain: -0.1 },
            { band: 13, gain: -0.15 },
            { band: 14, gain: -0.15 },
        ],
    },
    soft: {
        label: "Soft 🍃",
        description: "Gentle, relaxed sound",
        equalizer: [
            { band: 0, gain: 0.0 },
            { band: 1, gain: 0.0 },
            { band: 2, gain: 0.0 },
            { band: 3, gain: 0.0 },
            { band: 4, gain: 0.0 },
            { band: 5, gain: 0.0 },
            { band: 6, gain: 0.0 },
            { band: 7, gain: 0.0 },
            { band: 8, gain: -0.15 },
            { band: 9, gain: -0.2 },
            { band: 10, gain: -0.15 },
            { band: 11, gain: -0.15 },
            { band: 12, gain: -0.1 },
            { band: 13, gain: -0.1 },
            { band: 14, gain: 0.05 },
        ],
        lowPass: { smoothing: 15.0 },
    },
    dolby: {
        label: "Dolby Atmos (Replica) 🪐",
        description: "High-fidelity simulated surround sound & rich EQ",
        equalizer: [
            { band: 0, gain: 0.3 },     // High sub bass impact
            { band: 1, gain: 0.2 },
            { band: 2, gain: 0.1 },
            { band: 3, gain: 0.05 },
            { band: 4, gain: 0.0 },
            { band: 5, gain: -0.05 },   // Scoop muddy frequencies
            { band: 6, gain: -0.05 },
            { band: 7, gain: 0.0 },
            { band: 8, gain: 0.05 },
            { band: 9, gain: 0.1 },
            { band: 10, gain: 0.15 },
            { band: 11, gain: 0.2 },
            { band: 12, gain: 0.25 },   // Crystal clear highs/air
            { band: 13, gain: 0.25 },
            { band: 14, gain: 0.25 }
        ],
        rotation: { rotationHz: 0.02 }, // Extremely subtle ultra-wide spatial expansion
    },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("filter")
        .setDescription("Apply an audio filter preset")
        .addStringOption(option => {
            option
                .setName("preset")
                .setDescription("Filter preset to apply")
                .setRequired(true);

            // Add choices dynamically
            const choices = [
                { name: "🚫 Reset (No Filter)", value: "reset" },
                ...Object.entries(FILTERS).map(([key, val]) => ({
                    name: val.label,
                    value: key,
                })),
            ];

            option.addChoices(...choices);
            return option;
        }),

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

        const preset = interaction.options.getString("preset");

        if (preset === "reset") {
            // Clear all filters
            await player.shoukaku.clearFilters();

            if (!player.data) player.data = new Map();
            player.data.set("activeFilter", null);

            return interaction.reply({
                embeds: [successEmbed("Filters Reset 🚫", "All audio filters have been removed.")],
            });
        }

        const filter = FILTERS[preset];
        if (!filter) {
            return interaction.reply({
                embeds: [errorEmbed("Unknown Filter", "That filter preset doesn't exist.")],
                ephemeral: true,
            });
        }

        // Build filter object
        const filterPayload = {};
        if (filter.equalizer) filterPayload.equalizer = filter.equalizer;
        if (filter.timescale) filterPayload.timescale = filter.timescale;
        if (filter.rotation) filterPayload.rotation = filter.rotation;
        if (filter.karaoke) filterPayload.karaoke = filter.karaoke;
        if (filter.tremolo) filterPayload.tremolo = filter.tremolo;
        if (filter.vibrato) filterPayload.vibrato = filter.vibrato;
        if (filter.lowPass) filterPayload.lowPass = filter.lowPass;

        await player.shoukaku.setFilters(filterPayload);

        if (!player.data) player.data = new Map();
        player.data.set("activeFilter", preset);

        const embed = new EmbedBuilder()
            .setColor(config.colors.main)
            .setAuthor({ name: "Audio Filter Applied 🎛️" })
            .setDescription(
                `**${filter.label}**\n${filter.description}\n\n` +
                `*Use \`/filter reset\` to remove all filters.*`
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player) {
            return message.reply({ embeds: [errorEmbed("Nothing Playing", "There's nothing playing.")] });
        }

        const preset = args[0]?.toLowerCase();

        if (!preset) {
            const available = Object.entries(FILTERS)
                .map(([key, val]) => `\`${key}\` — ${val.description}`)
                .join("\n");

            return message.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(config.colors.info)
                        .setTitle("Available Filters 🎛️")
                        .setDescription(`${available}\n\n\`reset\` — Remove all filters`)
                        .setFooter({ text: "Usage: !filter <name>" }),
                ],
            });
        }

        if (preset === "reset") {
            await player.shoukaku.clearFilters();
            return message.reply({ embeds: [successEmbed("Filters Reset 🚫")] });
        }

        const filter = FILTERS[preset];
        if (!filter) {
            return message.reply({ embeds: [errorEmbed("Unknown Filter", `Use \`!filter\` to see available presets.`)] });
        }

        const filterPayload = {};
        if (filter.equalizer) filterPayload.equalizer = filter.equalizer;
        if (filter.timescale) filterPayload.timescale = filter.timescale;
        if (filter.rotation) filterPayload.rotation = filter.rotation;
        if (filter.karaoke) filterPayload.karaoke = filter.karaoke;
        if (filter.tremolo) filterPayload.tremolo = filter.tremolo;
        if (filter.vibrato) filterPayload.vibrato = filter.vibrato;
        if (filter.lowPass) filterPayload.lowPass = filter.lowPass;

        await player.shoukaku.setFilters(filterPayload);
        message.reply({ embeds: [successEmbed(`${filter.label}`, filter.description)] });
    },
};
