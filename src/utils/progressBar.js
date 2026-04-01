/**
 * Generate a visual progress bar for the currently playing track.
 * @param {number} current - Current position in ms
 * @param {number} total - Total duration in ms
 * @param {number} [length=15] - Bar length in characters
 * @returns {string} Progress bar string
 */
function createProgressBar(current, total, length = 15) {
    if (!total || total <= 0) return "▬".repeat(length);

    const progress = Math.min(current / total, 1);
    const filledLength = Math.round(progress * length);

    const filled = "▬".repeat(Math.max(0, filledLength));
    const empty = "▬".repeat(Math.max(0, length - filledLength - 1));
    const indicator = "🔘";

    if (filledLength >= length) {
        return "▬".repeat(length - 1) + indicator;
    }

    return filled + indicator + empty;
}

/**
 * Generate a volume level indicator.
 * @param {number} volume - Volume level (0-150)
 * @returns {string} Volume bar string
 */
function createVolumeBar(volume) {
    const maxBlocks = 10;
    const filled = Math.round((volume / 150) * maxBlocks);
    const empty = maxBlocks - filled;

    let emoji;
    if (volume === 0) emoji = "🔇";
    else if (volume < 30) emoji = "🔈";
    else if (volume < 70) emoji = "🔉";
    else emoji = "🔊";

    return `${emoji} ${"█".repeat(filled)}${"░".repeat(empty)} ${volume}%`;
}

module.exports = { createProgressBar, createVolumeBar };
