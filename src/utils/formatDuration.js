/**
 * Convert milliseconds to a human-readable duration string.
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "3:45" or "1:02:30")
 */
function formatDuration(ms) {
    if (!ms || isNaN(ms) || ms <= 0) return "0:00";
    if (ms === Infinity) return "🔴 LIVE";

    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    const pad = (n) => n.toString().padStart(2, "0");

    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${minutes}:${pad(seconds)}`;
}

/**
 * Convert a time string to milliseconds.
 * Supports: "1:30", "01:30", "1:02:30", "90" (seconds)
 * @param {string} time - Time string
 * @returns {number} Milliseconds
 */
function parseTimeString(time) {
    if (!time) return 0;

    // If it's just a number, treat as seconds
    if (/^\d+$/.test(time)) {
        return parseInt(time) * 1000;
    }

    const parts = time.split(":").map(Number);

    if (parts.some(isNaN)) return 0;

    if (parts.length === 3) {
        // HH:MM:SS
        return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    } else if (parts.length === 2) {
        // MM:SS
        return (parts[0] * 60 + parts[1]) * 1000;
    }

    return 0;
}

/**
 * Format a large number with commas.
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports = { formatDuration, parseTimeString, formatNumber };
