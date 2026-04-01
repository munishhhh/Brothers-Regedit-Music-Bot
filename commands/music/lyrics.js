const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const finder = require("lyrics-finder");
const { errorEmbed, successEmbed } = require("../../src/structures/EmbedBuilder");
const config = require("../../config");

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
            let lyrics = await finder("", query);
            
            if (!lyrics) {
                return interaction.editReply({
                    embeds: [errorEmbed("Not Found", `Could not find any lyrics matching \`${query}\``)]
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
            let lyrics = await finder("", query);
            if (!lyrics) return reply.edit({ embeds: [errorEmbed("Not Found", `Could not find any lyrics matching \`${query}\``)] });

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
