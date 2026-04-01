const { SlashCommandBuilder } = require("discord.js");
const { errorEmbed, successEmbed, loadingEmbed } = require("../../src/structures/EmbedBuilder");
const { listenToUser, savePlayerState, restorePlayerState, cleanRecognizedText } = require("../../src/voice/voiceListener");
const logger = require("../../src/utils/logger");
const config = require("../../config");

module.exports = {
    aliases: ["voice", "v"],
    data: new SlashCommandBuilder()
        .setName("listen")
        .setDescription("🎤 Say a song name and I'll play it! (like Alexa)"),

    async execute(interaction, client) {
        await handleVoiceListen(interaction, client, false);
    },

    async prefixExecute(message, args, client) {
        await handleVoiceListen(message, client, true);
    },
};

/**
 * Core voice listen handler — works for slash, prefix, and button.
 */
async function handleVoiceListen(context, client, isPrefix = false) {
    const member = context.member;
    const guild = context.guild || context.member?.guild;
    const voiceChannel = member?.voice?.channel;

    // ── Validate ────────────────────────────────────
    if (!voiceChannel) {
        const reply = {
            embeds: [errorEmbed("Not in Voice Channel", "You need to join a voice channel first! 🎤")],
            ephemeral: true,
        };
        return isPrefix ? context.reply(reply) : context.reply(reply);
    }

    if (!process.env.GEMINI_API_KEY) {
        const reply = {
            embeds: [errorEmbed(
                "Voice Recognition Not Setup",
                "Add `GEMINI_API_KEY` to `.env`\n\n" +
                "Get one free at [Google AI Studio](https://aistudio.google.com/app/apikey)"
            )],
            ephemeral: true,
        };
        return isPrefix ? context.reply(reply) : context.reply(reply);
    }

    // ── Show "listening" indicator ──────────────────
    const { EmbedBuilder: DiscordEmbed } = require("discord.js");
    const listeningEmbed = new DiscordEmbed()
        .setColor(0x00D26A)
        .setDescription(
            "🎤 **I'm listening — speak now!**\n\n" +
            "💡 Say something like:\n" +
            '> *"Play Shape of You"*\n' +
            '> *"Eminem Lose Yourself"*\n' +
            '> *"Lo-fi chill beats"*\n\n' +
            "I'll stop recording when you stop talking."
        );

    let statusMsg;
    if (isPrefix) {
        statusMsg = await context.reply({ embeds: [listeningEmbed] });
    } else {
        if (context.deferred || context.replied) {
            statusMsg = await context.editReply({ embeds: [listeningEmbed] });
        } else {
            await context.deferReply();
            statusMsg = await context.editReply({ embeds: [listeningEmbed] });
        }
    }

    // ── Save current player state ───────────────────
    const existingPlayer = client.manager.players.get(guild.id);
    let savedState = null;

    if (existingPlayer) {
        savedState = savePlayerState(existingPlayer);
        logger.info("[Listen] Saving player state & pausing for voice capture...");

        try {
            existingPlayer.destroy();
        } catch (err) {
            logger.warn("[Listen] Error destroying player:", err.message);
        }

        await new Promise(r => setTimeout(r, 500));
    }

    try {
        // ── Record & transcribe ─────────────────────
        const rawText = await listenToUser(guild, voiceChannel, member.user.id);

        if (!rawText || rawText.trim().length === 0) {
            // No speech — restore player
            if (savedState) {
                await restorePlayerState(client, guild.id, savedState);
            }

            const noSpeechEmbed = new DiscordEmbed()
                .setColor(config.colors.error)
                .setDescription(
                    "🤔 **Couldn't hear you!**\n\n" +
                    "Make sure you're:\n" +
                    "• Not muted in Discord\n" +
                    "• Speaking clearly after the command\n" +
                    "• Close enough to your mic"
                );

            if (isPrefix) {
                return statusMsg.edit({ embeds: [noSpeechEmbed] });
            } else {
                return context.editReply({ embeds: [noSpeechEmbed] });
            }
        }

        // ── Clean the recognized text ───────────────
        const songQuery = cleanRecognizedText(rawText);
        
        logger.info(`[Listen] Raw: "${rawText}" → Cleaned: "${songQuery}"`);

        // Show what was recognized
        const recognizedEmbed = new DiscordEmbed()
            .setColor(0x00D26A)
            .setDescription(
                `🎤 **Heard:** "${rawText}"\n` +
                `🔎 **Searching:** "${songQuery}"...`
            );

        if (isPrefix) {
            await statusMsg.edit({ embeds: [recognizedEmbed] });
        } else {
            await context.editReply({ embeds: [recognizedEmbed] });
        }

        // ── Restore player + play recognized song ───
        let player;

        if (savedState) {
            player = await restorePlayerState(client, guild.id, savedState);
        } else {
            player = await client.manager.createPlayer({
                guildId: guild.id,
                voiceId: voiceChannel.id,
                textId: (context.channel || context).id,
                deaf: false,
                volume: config.defaultVolume,
            });
        }

        // ── Search for the song ─────────────────────
        const result = await client.manager.search(songQuery, {
            requester: member.user || member,
            engine: config.player.defaultSearchEngine,
        });

        if (!result || !result.tracks || result.tracks.length === 0) {
            const noResultEmbed = new DiscordEmbed()
                .setColor(config.colors.error)
                .setDescription(
                    `❌ **No results for:** "${songQuery}"\n\n` +
                    `Try saying the song name more clearly.`
                );

            if (isPrefix) {
                return statusMsg.edit({ embeds: [noResultEmbed] });
            } else {
                return context.editReply({ embeds: [noResultEmbed] });
            }
        }

        // Add first result
        const track = result.tracks[0];
        player.queue.add(track);

        if (!player.playing && !player.paused) {
            player.play();
        }

        // ── Show success ────────────────────────────
        const { formatDuration } = require("../../src/utils/formatDuration");

        const finalEmbed = new DiscordEmbed()
            .setColor(config.colors.success)
            .setAuthor({ name: "🎤 Voice Request" })
            .setTitle(track.title || "Unknown")
            .setURL(track.uri || null)
            .setThumbnail(track.thumbnail || null)
            .addFields(
                { name: "🎙️ You Said", value: `"${rawText}"`, inline: false },
                { name: "🎵 Artist", value: track.author || "Unknown", inline: true },
                { name: "⏱️ Duration", value: formatDuration(track.length), inline: true }
            )
            .setFooter({
                text: `Voice request by ${member.user?.globalName || member.user?.username || "Unknown"}`,
                iconURL: member.user?.displayAvatarURL?.(),
            })
            .setTimestamp();

        if (isPrefix) {
            await statusMsg.edit({ embeds: [finalEmbed] });
        } else {
            await context.editReply({ embeds: [finalEmbed] });
        }

    } catch (err) {
        logger.error("[Listen] Voice recognition error:", err.message);
        console.error(err);

        // Restore player on error
        if (savedState) {
            try {
                await restorePlayerState(client, guild.id, savedState);
            } catch (re) {
                logger.error("[Listen] Failed to restore player:", re.message);
            }
        }

        const errEmbed = errorEmbed(
            "Voice Error",
            err.message.includes("GEMINI_API_KEY") ? err.message : `Something went wrong: ${err.message}`
        );

        if (isPrefix) {
            await statusMsg?.edit({ embeds: [errEmbed] }).catch(() => {});
        } else {
            await context.editReply({ embeds: [errEmbed] }).catch(() => {});
        }
    }
}

module.exports.handleVoiceListen = handleVoiceListen;
