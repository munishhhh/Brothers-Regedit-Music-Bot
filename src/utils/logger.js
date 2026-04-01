const chalk = {
    gray: (s) => `\x1b[90m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    magenta: (s) => `\x1b[35m${s}\x1b[0m`,
    white: (s) => `\x1b[37m${s}\x1b[0m`,
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function getTimestamp() {
    return chalk.gray(`[${new Date().toLocaleTimeString("en-US", { hour12: false })}]`);
}

const logger = {
    info: (...args) => {
        console.log(getTimestamp(), chalk.cyan("INFO"), chalk.white("│"), ...args);
    },

    success: (...args) => {
        console.log(getTimestamp(), chalk.green(" OK "), chalk.white("│"), ...args);
    },

    warn: (...args) => {
        console.log(getTimestamp(), chalk.yellow("WARN"), chalk.white("│"), ...args);
    },

    error: (...args) => {
        console.error(getTimestamp(), chalk.red("ERR!"), chalk.white("│"), ...args);
    },

    debug: (...args) => {
        if (process.env.DEBUG === "true") {
            console.log(getTimestamp(), chalk.magenta("DBUG"), chalk.white("│"), ...args);
        }
    },

    music: (...args) => {
        console.log(getTimestamp(), chalk.magenta(" ♪  "), chalk.white("│"), ...args);
    },

    divider: () => {
        console.log(chalk.gray("─".repeat(50)));
    },

    banner: () => {
        console.log(chalk.cyan(`
    ╔══════════════════════════════════════════╗
    ║    🎧  Brothers Regedit Music Bot  🎧    ║
    ║         Powered by Lavalink v4           ║
    ╚══════════════════════════════════════════╝
        `));
    }
};

module.exports = logger;
