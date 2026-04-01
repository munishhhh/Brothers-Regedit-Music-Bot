const Genius = require("genius-lyrics");
const Client = new Genius.Client();

(async () => {
    try {
        console.log("Searching with Genius API...");
        const searches = await Client.songs.search("Anuv Jain HUSN");
        if (!searches || searches.length === 0) {
            return console.log("Not found.");
        }
        const song = searches[0];
        const lyrics = await song.lyrics();
        console.log("FOUND:", !!lyrics);
        console.log("Title:", song.title);
        console.log("Artist:", song.artist.name);
        console.log(lyrics.substring(0, 100));
    } catch (e) {
        console.error("Error:", e.message);
    }
})();
