const { GlobalKeyboardListener } = require("node-global-key-listener");
const v = new GlobalKeyboardListener();

console.log("Key hook active. Waiting for user to press keys...");
let count = 0;

v.addListener((e, down) => {
    if (e.state === "DOWN") {
        console.log(`PRESSED -> Name: "${e.name}", vKey: ${e.vKey}`);
        count++;
        // Stop after 20 keys to prevent infinite loops
        if (count >= 20) {
            console.log("Max keys registered. Exiting test.");
            process.exit(0);
        }
    }
});

setTimeout(() => {
    console.log("Test timed out.");
    process.exit(0);
}, 30000); // Wait 30 seconds for the user
