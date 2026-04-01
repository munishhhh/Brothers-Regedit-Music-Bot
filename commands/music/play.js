const { SlashCommandBuilder } = require("discord.js");
const { errorEmbed, trackAddedEmbed, playlistAddedEmbed, loadingEmbed } = require("../../src/structures/EmbedBuilder");
const { formatDuration } = require("../../src/utils/formatDuration");
const logger = require("../../src/utils/logger");
const config = require("../../config");

module.exports = {
    aliases: ["p"],
    data: new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song or add it to the queue")
        .addStringOption(option =>
            option
                .setName("query")
                .setDescription("Song name or URL (or leave empty for a random mix)")
                .setRequired(false)
        ),

    async execute(interaction, client) {
        const { member, guild } = interaction;
        const voiceChannel = member.voice.channel;

        // ── Validate voice channel ──────────────────
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [errorEmbed("Not in Voice Channel", "You need to join a voice channel first!")],
                ephemeral: true,
            });
        }

        // Check bot permissions in voice channel
        const permissions = voiceChannel.permissionsFor(guild.members.me);
        if (!permissions.has("Connect") || !permissions.has("Speak")) {
            return interaction.reply({
                embeds: [errorEmbed("Missing Permissions", "I need **Connect** and **Speak** permissions in your voice channel.")],
                ephemeral: true,
            });
        }

        let query = interaction.options.getString("query");

        // Show loading state
        await interaction.deferReply();

        try {
            // ── Create or get player ────────────────
            let player = client.manager.players.get(guild.id);
            
            // If NO query provided
            if (!query) {
                // If player is paused, just resume it natively
                if (player && player.paused) {
                    player.pause(false);
                    return interaction.editReply({
                        embeds: [successEmbed("Resumed", "▶️ Playback has been resumed.")]
                    });
                }
                
                // Otherwise, use YouTube Music algorithm to generate a reliable massive playlist
                const RANDOM_QUERIES = [
                    "global top 50 hits english", "viral pop hits 2024 english", "lofi chill beats radio english"
                ];
                query = RANDOM_QUERIES[Math.floor(Math.random() * RANDOM_QUERIES.length)];
                interaction.isRandomFallback = true;
            }

            if (!player) {
                player = await client.manager.createPlayer({
                    guildId: guild.id,
                    voiceId: voiceChannel.id,
                    textId: interaction.channelId,
                    deaf: true,
                    volume: config.defaultVolume,
                });
            }

            // Cancel any pending disconnect timeout
            const disconnectTimeout = player.data?.get("disconnectTimeout");
            if (disconnectTimeout) {
                clearTimeout(disconnectTimeout);
                player.data.delete("disconnectTimeout");
            }

            // ── Search for tracks ───────────────────
            let searchEngine = config.player.defaultSearchEngine;

            // Auto-detect source from URL
            if (query.match(/^https?:\/\/(www\.)?spotify\.com/)) {
                searchEngine = "spotify";
            } else if (query.match(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/)) {
                searchEngine = "youtube";
            } else if (query.match(/^https?:\/\//)) {
                searchEngine = "youtube"; // Default for other URLs
            }

            const result = await client.manager.search(query, {
                requester: interaction.user,
                engine: searchEngine,
            });

            // ── Handle search results ───────────────
            if (!result || !result.tracks || result.tracks.length === 0) {
                return interaction.editReply({
                    embeds: [errorEmbed("No Results", `No tracks found for: \`${query}\``)],
                });
            }

            switch (result.type) {
                case "PLAYLIST": {
                    // Add all tracks from playlist
                    for (const track of result.tracks) {
                        player.queue.add(track);
                    }

                    if (!player.playing && !player.paused) {
                        player.play();
                    }

                    await interaction.editReply({
                        embeds: [playlistAddedEmbed(
                            result.playlistName || "Playlist",
                            result.tracks,
                            interaction.user
                        )],
                    });
                    break;
                }

                case "TRACK":
                case "SEARCH": {
                    if (interaction.isRandomFallback) {
                        for (const track of result.tracks) player.queue.add(track);
                        player.queue.shuffle();
                        if (!player.playing && !player.paused) player.play();
                        
                        await interaction.editReply({
                            embeds: [playlistAddedEmbed("Random Mix", result.tracks, interaction.user)],
                        });
                        break;
                    }

                    const track = result.tracks[0];
                    player.queue.add(track);

                    if (!player.playing && !player.paused) {
                        player.play();

                        // Don't show "added to queue" — playerStart will show now-playing
                        await interaction.editReply({
                            embeds: [trackAddedEmbed(track, player.queue.length || "Now")],
                        });
                    } else {
                        await interaction.editReply({
                            embeds: [trackAddedEmbed(track, player.queue.length)],
                        });
                    }
                    break;
                }

                default: {
                    return interaction.editReply({
                        embeds: [errorEmbed("No Results", `Could not process results for: \`${query}\``)],
                    });
                }
            }
        } catch (err) {
            logger.error("Play command error:", err.message);
            console.error(err);

            await interaction.editReply({
                embeds: [errorEmbed("Playback Error", `Failed to play: \`${query}\`\n\`\`\`${err.message}\`\`\``)],
            }).catch(() => {});
        }
    },

    // ── Prefix command support ──────────────────────
    async prefixExecute(message, args, client) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({ embeds: [errorEmbed("Not in Voice Channel", "You need to join a voice channel first!")] });
        }

        let query = args.join(" ");

        try {
            let player = client.manager.players.get(message.guild.id);

            if (!query) {
                if (player && player.paused) {
                    player.pause(false);
                    return message.reply({ embeds: [successEmbed("Resumed", "▶️ Playback has been resumed.")] });
                }
                const RANDOM_QUERIES = [
                    "global top 50 hits english", "viral pop hits 2024 english", "lofi chill beats radio english"
                ];
                query = RANDOM_QUERIES[Math.floor(Math.random() * RANDOM_QUERIES.length)];
                message.isRandomFallback = true;
                message.reply(`Loading a random mix...`);
            }

            if (!player) {
                player = await client.manager.createPlayer({
                    guildId: message.guild.id,
                    voiceId: voiceChannel.id,
                    textId: message.channelId,
                    deaf: true,
                    volume: config.defaultVolume,
                });
            }

            const result = await client.manager.search(query, {
                requester: message.author,
                engine: config.player.defaultSearchEngine,
            });

            if (!result || !result.tracks || result.tracks.length === 0) {
                return message.reply({ embeds: [errorEmbed("No Results", `No tracks found for: \`${query}\``)] });
            }

            if (result.type === "PLAYLIST") {
                for (const track of result.tracks) {
                    player.queue.add(track);
                }
                if (!player.playing && !player.paused) player.play();
                return message.reply({ embeds: [playlistAddedEmbed(result.playlistName || "Playlist", result.tracks, message.author)] });
            }

            if (message.isRandomFallback && result.type === "SEARCH") {
                for (const track of result.tracks) player.queue.add(track);
                player.queue.shuffle();
                if (!player.playing && !player.paused) player.play();
                return message.reply({ embeds: [playlistAddedEmbed("Random Mix", result.tracks, message.author)] });
            }

            const track = result.tracks[0];
            player.queue.add(track);
            if (!player.playing && !player.paused) player.play();
            message.reply({ embeds: [trackAddedEmbed(track, player.queue.length || "Now")] });
        } catch (err) {
            logger.error("Prefix play error:", err.message);
            message.reply({ embeds: [errorEmbed("Error", err.message)] });
        }
    },
};
