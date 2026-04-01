const logger = require("./logger");

let isInitialized = false;

function setupKeyboardListener(client) {
    if (isInitialized) return;
    
    try {
        if (process.platform !== "win32") {
            // Wispbyte/Linux hosts don't support global key listeners
            return;
        }
        const { GlobalKeyboardListener } = require("node-global-key-listener");
        const v = new GlobalKeyboardListener();
        logger.info("Host Media-Key bindings loaded (Play/Pause/Next/Prev directly from PC)");
        isInitialized = true;

        v.addListener((e, down) => {
            if (e.state === "DOWN") {
                const keyName = (e.name || "").toUpperCase();
                const vKey = e.vKey;
                
                // Allow Media Names OR the explicit 4 media VKeys
                const isTarget = keyName.includes("MEDIA") || keyName.includes("PLAY") || keyName.includes("NEXT") || keyName.includes("PREV") || keyName.includes("STOP") 
                                 || [176, 177, 178, 179].includes(vKey);

                if (!isTarget) return;

                const players = Array.from(client.manager.players.values());
                if (players.length === 0) return;
                
                const player = players[0]; 

                // PLAY/PAUSE = 179
                if (vKey === 179 || keyName.includes("PLAY") || keyName.includes("PAUSE")) {
                    player.pause(!player.paused);
                    logger.music(`[Media Key] ${player.paused ? "⏸️ Paused" : "▶️ Resumed"}`);
                } 
                // NEXT = 176
                else if (vKey === 176 || keyName.includes("NEXT")) {
                    player.skip(); 
                    logger.music("[Media Key] ⏭️ Skipped track");
                } 
                // PREV = 177
                else if (vKey === 177 || keyName.includes("PREV")) {
                    const previousTrack = player.getPrevious(true); // Retrieves cleanly from Kazagumo history
                    if (previousTrack) {
                        player.queue.add(previousTrack, 0);
                        player.skip();
                        logger.music("[Media Key] ⏮️ Previous track");
                    } else {
                        logger.music("[Media Key] ⏮️ No previous track history available");
                    }
                }
                // STOP = 178
                else if (vKey === 178 || keyName.includes("STOP")) {
                    player.destroy();
                    logger.music("[Media Key] ⏹️ Player stopped");
                }
            }
        });
    } catch (err) {
        logger.error("Could not bind local keyboard listener:", err.message);
    }
}

module.exports = { setupKeyboardListener };
