const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Genius = require("genius-lyrics");
const Client = new Genius.Client();
const { errorEmbed, successEmbed } = require("../../src/structures/EmbedBuilder");
const config = require("../../config");
const https = require("https");

function fetchLrcLib(query) {
    return new Promise((resolve) => {
        const url = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        https.get(url, { headers: { "User-Agent": "DiscordBot (https://github.com/)" } }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                if (res.statusCode === 200) {
                    try {
                        let json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        resolve([]);
                    }
                } else {
                    resolve([]);
                }
            });
        }).on("error", () => resolve([]));
    });
}

async function getLyrics(query) {
    try {
        const lrcRes = await fetchLrcLib(query);
        if (lrcRes && lrcRes.length > 0) {
            let track = lrcRes[0];
            let lyrics = track.plainLyrics || track.syncedLyrics;
            if (lyrics) return lyrics;
        }
    } catch(e) {}
    
    try {
        const searches = await Client.songs.search(query);
        if (searches && searches.length > 0) {
            return await searches[0].lyrics();
        }
    } catch (err) {}
    
    return null;
}

module.exports = {
    aliases: ["ly"],
    data: new SlashCommandBuilder()
        .setName("lyrics")
        .setDescription("Get lyrics for the currenly playing song or a specific search query")
        .addStringOption(option => 
            option.setName("query")
            .setDescription("The song name to search lyrics for (Leave empty for current song)")
            .setRequired(false)
        ),

    async execute(interaction, client) {
        await interaction.deferReply();
        
        let query = interaction.options.getString("query");
        
        let player = client.manager.players.get(interaction.guild.id);
        
        if (!query) {
            if (!player || !player.queue.current) {
                return interaction.editReply({
                    embeds: [errorEmbed("No Query Provided", "You must provide a song name, or play a song to fetch its lyrics!")]
                });
            }
            
            // Clean up titles (remove "Official Video", "Lyrics", etc. for better scraping accuracy)
            const rawTitle = player.queue.current.title;
            const author = player.queue.current.author;
            // Best effort generic match
            query = `${rawTitle} ${author !== "Unknown" ? author : ""}`.replace(/Official Video|Official Audio|Lyrics|Music Video|\(.*\)|\[.*\]/gi, "").trim();
        }

        try {
            let lyrics = await getLyrics(query);
            
            if (!lyrics) {
                return interaction.editReply({
                    embeds: [errorEmbed("Not Found", `Could not find any lyrics matching \`${query}\`.`)]
                });
            }

            // Discord has a 4096 char limit for descriptions. Chunk the lyrics if needed.
            const chunked_lyrics = lyrics.match(/[\s\S]{1,4090}/g) || ["No lyrics extracted."];
            
            const embed = new EmbedBuilder()
                .setColor(config.colors.main)
                .setAuthor({ name: `Lyrics 🎤`, iconURL: interaction.user.displayAvatarURL() })
                .setTitle(query)
                .setDescription(chunked_lyrics[0])
                .setFooter({ text: "Powered by Genius/Musixmatch Lyrics Finder" })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Send remaining chunks if song is extremely long
            if (chunked_lyrics.length > 1) {
                for (let i = 1; i < chunked_lyrics.length; i++) {
                    const extraEmbed = new EmbedBuilder()
                        .setColor(config.colors.main)
                        .setDescription(chunked_lyrics[i]);
                    await interaction.followUp({ embeds: [extraEmbed] });
                }
            }
            
        } catch (err) {
            console.error("Lyrics Error:", err);
            return interaction.editReply({
                embeds: [errorEmbed("Error", "An API error occurred while searching for lyrics.")]
            });
        }
    },

    async prefixExecute(message, args, client) {
        let query = args.join(" ");
        let player = client.manager.players.get(message.guild.id);
        
        if (!query) {
            if (!player || !player.queue.current) {
                return message.reply({
                    embeds: [errorEmbed("No Query Provided", "You must provide a song name, or play a song to fetch its lyrics!")]
                });
            }
            const rawTitle = player.queue.current.title;
            const author = player.queue.current.author;
            query = `${rawTitle} ${author !== "Unknown" ? author : ""}`.replace(/Official Video|Official Audio|Lyrics|Music Video|\(.*\)|\[.*\]/gi, "").trim();
        }

        const reply = await message.reply("⏳ Fetching live lyrics...");

        try {
            let lyrics = await getLyrics(query);

            if (!lyrics) return reply.edit({ embeds: [errorEmbed("Not Found", `Could not find any lyrics matching \`${query}\`.`)] });

            const chunked_lyrics = lyrics.match(/[\s\S]{1,4090}/g) || ["No lyrics extracted."];
            
            const embed = new EmbedBuilder()
                .setColor(config.colors.main)
                .setTitle(`🎤 ${query}`)
                .setDescription(chunked_lyrics[0]);

            await reply.edit({ embeds: [embed] });

            if (chunked_lyrics.length > 1) {
                for (let i = 1; i < chunked_lyrics.length; i++) {
                    await message.channel.send({ embeds: [new EmbedBuilder().setColor(config.colors.main).setDescription(chunked_lyrics[i])] });
                }
            }
        } catch (err) {
            reply.edit({ embeds: [errorEmbed("Error", "An API error occurred while searching for lyrics.")] });
        }
    }
};
