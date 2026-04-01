const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const { errorEmbed, successEmbed, loadingEmbed, warningEmbed } = require("../../src/structures/EmbedBuilder");
const youtubedl = require("youtube-dl-exec");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ffmpegPath = require("ffmpeg-static");

// Ensure outputs directory exists
const outputDir = path.join(process.cwd(), "outputs");
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

module.exports = {
    aliases: ["dl", "save"],
    data: new SlashCommandBuilder()
        .setName("download")
        .setDescription("Download a song to your device (MP3)")
        .addStringOption(option => 
            option.setName("query")
                .setDescription("URL or search query to download. Leave blank to download current song.")
                .setRequired(false)),

    async execute(interaction, client) {
        await interaction.deferReply();
        let query = interaction.options.getString("query");
        
        // Auto-fetch current playing song if query is empty
        if (!query) {
            const player = client.manager.players.get(interaction.guildId);
            if (player && player.queue.current) {
                query = player.queue.current.uri;
            } else {
                return interaction.editReply({ embeds: [errorEmbed("Missing Query", "Nothing is currently playing. Please specify a URL or track name to download!")] });
            }
        }
        
        handleDownload(query, { user: interaction.user, editReply: (opts) => interaction.editReply(opts) }, client);
    },

    async prefixExecute(message, args, client) {
        let query = args.join(" ");

        // Auto-fetch current playing song if query is empty
        if (!query) {
            const player = client.manager.players.get(message.guild.id);
            if (player && player.queue.current) {
                query = player.queue.current.uri;
            } else {
                return message.reply({ embeds: [errorEmbed("Missing Query", "Usage: `!download <query/url>`\nOr play a song first to download it natively.")] });
            }
        }

        const reply = await message.reply(`⏳ Searching and preparing download for **${query}**...`);
        handleDownload(query, { user: message.author, editReply: (opts) => reply.edit(opts) }, client);
    }
};

async function handleDownload(query, context, client) {
    try {
        context.editReply({ embeds: [loadingEmbed(`Resolving track...`)] });
        const result = await client.manager.search(query, { requester: context.user });

        if (!result.tracks.length) {
            return context.editReply({ embeds: [errorEmbed("No Results", "Could not find any track matching your query.")] });
        }

        const track = result.tracks[0];
        const targetUrl = track.uri;
        
        const fileId = crypto.randomBytes(8).toString("hex");
        
        // Using strict relative paths to avoid Windows Space parsing errors in yt-dlp arguments
        // process.cwd() is 'c:\Brothers Regedit Music Bot', so relative path 'outputs/id.mp3' works perfectly smoothly
        const relativeOutputPath = `outputs/${fileId}.mp3`;
        const absoluteOutputPath = path.join(process.cwd(), relativeOutputPath);

        context.editReply({ embeds: [loadingEmbed(`Downloading **${track.title}** as high-quality MP3...\n*This might take a minute!*`)] });

        // Define yt-dlp arguments securely
        const ytDlpOptions = {
            output: relativeOutputPath, // Avoids space separation issues in the command shell
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ['referer:youtube.com', 'user-agent:Mozilla/5.0'],
            extractAudio: true,
            audioFormat: "mp3",
            audioQuality: 0, // Best quality
            ffmpegLocation: path.relative(process.cwd(), ffmpegPath) // Fix Windows space syntax issue
        };

        // Start child process for yt-dlp
        await youtubedl(targetUrl, ytDlpOptions);

        // Verify file exists
        if (!fs.existsSync(absoluteOutputPath)) {
            throw new Error("File was not downloaded (might be blocked by IP or region).");
        }

        const stats = fs.statSync(absoluteOutputPath);
        const mb = stats.size / (1024 * 1024);

        if (mb > 25.0) {
            fs.unlinkSync(absoluteOutputPath);
            return context.editReply({ embeds: [warningEmbed("Size Limit Exceeded", `The resulting file was **${mb.toFixed(1)} MB**, which exceeds Discord's free 25 MB limit.`)] });
        }

        // Clean filename (remove weird characters for the attachment)
        const safeTitle = track.title.replace(/[^a-zA-Z0-9\s-]/g, "").substring(0, 50).trim();
        const attachment = new AttachmentBuilder(absoluteOutputPath, { name: `${safeTitle}.mp3` });

        // Send file
        await context.editReply({ 
            embeds: [successEmbed("Download Complete 📥", `[**${track.title}**](${track.uri}) is ready!`)],
            files: [attachment] 
        });

        // Cleanup local file aggressively
        setTimeout(() => {
            if (fs.existsSync(absoluteOutputPath)) {
                fs.unlinkSync(absoluteOutputPath);
            }
        }, 10_000); 

    } catch (err) {
        console.error("Download error:", err);
        return context.editReply({ embeds: [errorEmbed("Download Failed", "There was an error processing your download. The source might be age-restricted or blocked.")] });
    }
}
