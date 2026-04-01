const logger = require("../../src/utils/logger");
const db = require("../../src/utils/db");
const { errorEmbed, successEmbed, nowPlayingEmbed, playerButtons } = require("../../src/structures/EmbedBuilder");
const { handleVoiceListen } = require("../../commands/music/listen");

module.exports = {
    name: "interactionCreate",
    once: false,

    async execute(interaction, client) {
        // ── Slash Commands ──────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                return interaction.reply({
                    embeds: [errorEmbed("Unknown Command", "This command does not exist.")],
                    ephemeral: true,
                });
            }

            try {
                await command.execute(interaction, client);
            } catch (err) {
                logger.error(`Slash command error (${interaction.commandName}):`, err.message);
                console.error(err);

                const reply = {
                    embeds: [errorEmbed("Command Error", "Something went wrong while executing this command.")],
                    ephemeral: true,
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply).catch(() => {});
                } else {
                    await interaction.reply(reply).catch(() => {});
                }
            }
        }

        // ── Button Interactions ─────────────────────
        else if (interaction.isButton()) {
            await handleButton(interaction, client);
        }
    },
};

/**
 * Handle music player button interactions.
 */
async function handleButton(interaction, client) {
    const player = client.manager.players.get(interaction.guildId);

    // ── Queue pagination buttons ────────────────────
    if (interaction.customId.startsWith("queue_")) {
        if (interaction.customId.startsWith("queue_prev_") || interaction.customId.startsWith("queue_next_")) {
            const currentPage = parseInt(interaction.customId.split("_").pop());
            const newPage = interaction.customId.startsWith("queue_prev_") ? currentPage - 1 : currentPage + 1;

            // Re-run queue command with new page
            const queueCommand = client.commands.get("queue");
            if (queueCommand && queueCommand.showQueuePage) {
                await queueCommand.showQueuePage(interaction, client, newPage);
            }
            return;
        }
    }

    // ── 🎤 Voice Request button (special — handled before player check) ──
    if (interaction.customId === "music_voice_request") {
        const member = interaction.member;
        const voiceChannel = member?.voice?.channel;

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [errorEmbed("Not in Voice", "You need to be in a voice channel to use voice requests.")],
                ephemeral: true,
            }).catch(() => {});
        }

        // Use the same handler as /listen command
        await handleVoiceListen(interaction, client, false);
        return;
    }

    // ── Music control buttons ───────────────────────
    if (!interaction.customId.startsWith("music_")) return;

    if (!player) {
        return interaction.reply({
            embeds: [errorEmbed("No Player", "There's nothing playing right now.")],
            ephemeral: true,
        }).catch(() => {});
    }

    // Check if user is in the same voice channel
    const member = interaction.member;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel || voiceChannel.id !== player.voiceId) {
        return interaction.reply({
            embeds: [errorEmbed("Not in Voice", "You need to be in the same voice channel as the bot.")],
            ephemeral: true,
        }).catch(() => {});
    }

    try {
        switch (interaction.customId) {
            case "music_pause": {
                const newPaused = !player.paused;
                player.pause(newPaused);

                await interaction.reply({
                    embeds: [successEmbed(newPaused ? "Paused ⏸️" : "Resumed ▶️")],
                }).catch(() => {});

                // Auto-delete the response after 3 seconds
                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 3000);

                // Update the now playing message buttons
                await updateNowPlayingButtons(interaction, player);
                break;
            }

            case "music_skip": {
                const currentTitle = player.queue.current?.title || "Current track";
                player.skip();

                await interaction.reply({
                    embeds: [successEmbed("Skipped ⏭️", `Skipped **${currentTitle}**`)],
                }).catch(() => {});

                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 3000);
                break;
            }

            case "music_stop": {
                player.queue.clear();
                player.destroy();

                await interaction.reply({
                    embeds: [successEmbed("Stopped ⏹️", "Player stopped and queue cleared.")],
                }).catch(() => {});
                break;
            }

            case "music_loop": {
                const modes = ["none", "track", "queue"];
                const labels = { none: "Loop Off", track: "Looping Track 🔂", queue: "Looping Queue 🔁" };
                const currentIndex = modes.indexOf(player.loop || "none");
                const nextMode = modes[(currentIndex + 1) % modes.length];
                player.setLoop(nextMode);

                await interaction.reply({
                    embeds: [successEmbed(labels[nextMode])],
                }).catch(() => {});

                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 3000);
                break;
            }

            case "music_shuffle": {
                if (player.queue.length < 2) {
                    return interaction.reply({
                        embeds: [errorEmbed("Can't Shuffle", "Need at least 2 tracks in queue.")],
                        ephemeral: true,
                    }).catch(() => {});
                }

                player.queue.shuffle();
                await interaction.reply({
                    embeds: [successEmbed("Shuffled 🔀", `Shuffled ${player.queue.length} tracks.`)],
                }).catch(() => {});

                setTimeout(() => {
                    interaction.deleteReply().catch(() => {});
                }, 3000);
                break;
            }

            case "music_fav": {
                const currentTrack = player.queue.current;
                if (!currentTrack) return;
                
                const added = db.addFavorite(interaction.user.id, currentTrack);
                
                if (added) {
                    await interaction.reply({
                        embeds: [successEmbed("Added to Favorites ❤️", `Saved **${currentTrack.title}** to your library!`)],
                        ephemeral: true
                    }).catch(() => {});
                } else {
                    await interaction.reply({
                        embeds: [errorEmbed("Already Favorited", "This track is already in your personal library.")],
                        ephemeral: true
                    }).catch(() => {});
                }
                break;
            }
        }
    } catch (err) {
        logger.error("Button interaction error:", err.message);

        const reply = {
            embeds: [errorEmbed("Error", "Something went wrong.")],
            ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply).catch(() => {});
        } else {
            await interaction.reply(reply).catch(() => {});
        }
    }
}

/**
 * Update the buttons on the now-playing message.
 */
async function updateNowPlayingButtons(interaction, player) {
    try {
        if (player.data?.get("nowPlayingMessage")) {
            const msg = player.data.get("nowPlayingMessage");
            await msg.edit({ components: playerButtons(player) }).catch(() => {});
        }
    } catch {
        // Ignore errors if message is deleted
    }
}
