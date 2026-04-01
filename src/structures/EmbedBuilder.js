const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("../../config");
const { formatDuration } = require("../utils/formatDuration");
const { createProgressBar } = require("../utils/progressBar");

/**
 * Create a "Now Playing" embed with full track details.
 */
function nowPlayingEmbed(track, player) {
    const position = player.shoukaku.position || 0;
    const duration = track.length;
    const isLive = track.isStream;

    const embed = new EmbedBuilder()
        .setColor(config.colors.nowPlaying)
        .setAuthor({ name: "Now Playing 🎶", iconURL: track.requester?.displayAvatarURL?.() })
        .setTitle(track.title || "Unknown Title")
        .setURL(track.uri || null)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            {
                name: `${config.emojis.clock} Duration`,
                value: isLive
                    ? "🔴 LIVE"
                    : `${formatDuration(position)} / ${formatDuration(duration)}`,
                inline: true,
            },
            {
                name: `${config.emojis.disc} Author`,
                value: track.author || "Unknown",
                inline: true,
            },
            {
                name: `${config.emojis.volume} Volume`,
                value: `${player.volume}%`,
                inline: true,
            }
        )
        .setFooter({
            text: `Requested by ${track.requester?.globalName || track.requester?.username || "Unknown"}`,
            iconURL: track.requester?.displayAvatarURL?.(),
        })
        .setTimestamp();

    // Add progress bar for non-live tracks
    if (!isLive) {
        embed.setDescription(
            `${createProgressBar(position, duration)}\n\`${formatDuration(position)} / ${formatDuration(duration)}\``
        );
    }

    // Loop status
    const loopMode = player.loop || "none";
    if (loopMode !== "none") {
        embed.addFields({
            name: "🔁 Loop",
            value: loopMode === "track" ? "Track" : "Queue",
            inline: true,
        });
    }

    return embed;
}

/**
 * Create the button controls row for Now Playing message.
 */
function playerButtons(player) {
    const isPaused = player.paused;

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("music_pause")
            .setEmoji(isPaused ? "▶️" : "⏸️")
            .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("music_skip")
            .setEmoji("⏭️")
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId("music_stop")
            .setEmoji("⏹️")
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId("music_loop")
            .setEmoji("🔁")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("music_shuffle")
            .setEmoji("🔀")
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("music_fav")
            .setEmoji("❤️")
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId("music_voice_request")
            .setEmoji("🎤")
            .setLabel("Voice Request")
            .setStyle(ButtonStyle.Success)
    );

    return [row1, row2];
}

/**
 * Create a queue embed page.
 */
function queueEmbed(queue, currentTrack, page = 0, totalPages = 1) {
    const tracksPerPage = 10;
    const start = page * tracksPerPage;
    const tracks = queue.slice(start, start + tracksPerPage);

    const embed = new EmbedBuilder()
        .setColor(config.colors.queue)
        .setAuthor({ name: "📋 Music Queue" })
        .setTimestamp();

    // Current track
    if (currentTrack) {
        embed.setDescription(
            `**Now Playing:**\n` +
            `[${currentTrack.title}](${currentTrack.uri}) — \`${formatDuration(currentTrack.length)}\`\n` +
            `Requested by ${currentTrack.requester?.globalName || currentTrack.requester?.username || "Unknown"}\n\n` +
            `**Up Next:**`
        );
    }

    // Queue tracks
    if (tracks.length > 0) {
        const trackList = tracks
            .map((track, i) => {
                const index = start + i + 1;
                return `\`${index}.\` [${track.title}](${track.uri}) — \`${formatDuration(track.length)}\``;
            })
            .join("\n");

        embed.addFields({ name: "\u200B", value: trackList });
    } else if (!currentTrack) {
        embed.setDescription("The queue is empty. Use `/play` to add tracks!");
    }

    // Footer with stats
    const totalDuration = queue.reduce((acc, t) => acc + (t.length || 0), 0);
    embed.setFooter({
        text: `Page ${page + 1}/${totalPages} • ${queue.length} track${queue.length !== 1 ? "s" : ""} • Total: ${formatDuration(totalDuration)}`,
    });

    return embed;
}

/**
 * Queue navigation buttons.
 */
function queueButtons(page, totalPages) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`queue_prev_${page}`)
            .setEmoji("◀️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
        new ButtonBuilder()
            .setCustomId(`queue_page`)
            .setLabel(`${page + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        new ButtonBuilder()
            .setCustomId(`queue_next_${page}`)
            .setEmoji("▶️")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1)
    );
}

/**
 * Create a success embed.
 */
function successEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`${config.emojis.success} **${title}**${description ? `\n${description}` : ""}`)
        .setTimestamp();
}

/**
 * Create an error embed.
 */
function errorEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(config.colors.error)
        .setDescription(`${config.emojis.error} **${title}**${description ? `\n${description}` : ""}`)
        .setTimestamp();
}

/**
 * Create a warning embed.
 */
function warningEmbed(title, description) {
    return new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription(`${config.emojis.warning} **${title}**${description ? `\n${description}` : ""}`)
        .setTimestamp();
}

/**
 * Create a loading embed.
 */
function loadingEmbed(message) {
    return new EmbedBuilder()
        .setColor(config.colors.info)
        .setDescription(`${config.emojis.loading} ${message || "Loading..."}`);
}

/**
 * Create a track added embed.
 */
function trackAddedEmbed(track, position) {
    return new EmbedBuilder()
        .setColor(config.colors.main)
        .setAuthor({ name: "Added to Queue 🎶" })
        .setTitle(track.title || "Unknown")
        .setURL(track.uri || null)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            { name: "Duration", value: formatDuration(track.length), inline: true },
            { name: "Author", value: track.author || "Unknown", inline: true },
            { name: "Position", value: `#${position}`, inline: true }
        )
        .setFooter({
            text: `Requested by ${track.requester?.globalName || track.requester?.username || "Unknown"}`,
            iconURL: track.requester?.displayAvatarURL?.(),
        })
        .setTimestamp();
}

/**
 * Create a playlist added embed.
 */
function playlistAddedEmbed(playlistName, tracks, requester) {
    return new EmbedBuilder()
        .setColor(config.colors.main)
        .setAuthor({ name: "Playlist Added 📋" })
        .setDescription(
            `**${playlistName}**\n\n` +
            `${config.emojis.music} **${tracks.length}** tracks added to the queue`
        )
        .setFooter({
            text: `Requested by ${requester?.globalName || requester?.username || "Unknown"}`,
            iconURL: requester?.displayAvatarURL?.(),
        })
        .setTimestamp();
}

module.exports = {
    nowPlayingEmbed,
    playerButtons,
    queueEmbed,
    queueButtons,
    successEmbed,
    errorEmbed,
    warningEmbed,
    loadingEmbed,
    trackAddedEmbed,
    playlistAddedEmbed,
};
