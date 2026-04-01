const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const usersFile = path.join(dataDir, "users.json");

// Ensure data directory and file exist
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify({}), "utf8");
}

function readData() {
    try {
        const raw = fs.readFileSync(usersFile, "utf8");
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

function writeData(data) {
    fs.writeFileSync(usersFile, JSON.stringify(data, null, 2), "utf8");
}

module.exports = {
    getFavorites: (userId) => {
        const data = readData();
        if (!data[userId] || !data[userId].favorites) return [];
        return data[userId].favorites;
    },

    /**
     * @param {string} userId
     * @param {Object} track - Must have string title and string url/uri
     */
    addFavorite: (userId, track) => {
        const data = readData();
        if (!data[userId]) data[userId] = { favorites: [] };
        if (!data[userId].favorites) data[userId].favorites = [];

        // Check if already in favorites by exact Title or URL
        const exists = data[userId].favorites.some(t => t.uri === track.uri || t.title === track.title);
        if (exists) return false;

        data[userId].favorites.push({
            title: track.title,
            uri: track.uri || track.url,
            author: track.author || "Unknown"
        });

        writeData(data);
        return true;
    },

    removeFavoriteByTitle: (userId, indexOrTitle) => {
        const data = readData();
        if (!data[userId] || !data[userId].favorites) return false;

        const favs = data[userId].favorites;
        
        // If it's a number string index
        if (!isNaN(indexOrTitle) && Number(indexOrTitle) > 0 && Number(indexOrTitle) <= favs.length) {
            favs.splice(Number(indexOrTitle) - 1, 1);
            writeData(data);
            return true;
        }

        // Title search
        const idx = favs.findIndex(t => t.title.toLowerCase() === indexOrTitle.toLowerCase());
        if (idx !== -1) {
            favs.splice(idx, 1);
            writeData(data);
            return true;
        }
        return false;
    }
};
