const { SlashCommandBuilder } = require("discord.js");
const { errorEmbed, successEmbed, playlistAddedEmbed } = require("../../src/structures/EmbedBuilder");
const config = require("../../config");

// 50 vast, multi-genre, completely randomized search queries
// Lavalink will dynamically scrape the top 20-30 tracks for the chosen query, acting as a massive randomizer
const RANDOM_QUERIES = [
    "global top 50 hits", "viral tiktok songs 2024", "classic rock anthems", "90s r&b mix",
    "2000s pop hits", "electronic dance music hits", "chill lofi radio mix", "country music essentials",
    "heavy metal classics", "synthwave retrowave mix", "jazz piano background", "classical music best",
    "indie pop mix", "alternative rock 2000s", "acoustic chill covers", "reggaeton party hits",
    "afrobeats top hits", "k-pop viral hits", "uk drill mix", "hip hop rap bangers",
    "70s disco fever", "80s pop hits mix", "eurodance 90s party", "trap bass boosted mix",
    "house music club mix", "epic orchestral battle music", "gaming edm mix", "phonk drift mix",
    "movie soundstracks epic", "soft rock ballads", "blues guitar classics", "soul music legends",
    "punk rock anthems", "neo soul relax", "dubstep drops mix", "trance vocal edm",
    "future bass drops", "latin pop hits", "french house music", "bossanova chill mix",
    "celtic fantasy music", "cumbia mix party", "vibe out chill hits", "summer festival edm",
    "road trip driving music", "coffee shop acoustic", "gym hardstyle mix", "sad emotional songs mix",
    "pop punk 2000s nostalgia", "legendary live performances mix"
];

module.exports = {
    aliases: ["r", "surpriseme"],
    data: new SlashCommandBuilder()
        .setName("random")
        .setDescription("Play a random music mix"),

    async execute(interaction, client) {
        if (!interaction.member.voice.channel) {
            return interaction.reply({ embeds: [errorEmbed("Not in Voice", "You need to be in a voice channel!")], ephemeral: true });
        }

        await interaction.deferReply();
        playRandom({ member: interaction.member, user: interaction.user, guild: interaction.guild, editReply: (opts) => interaction.editReply(opts) }, client);
    },

    async prefixExecute(message, args, client) {
        if (!message.member.voice.channel) {
            return message.reply({ embeds: [errorEmbed("Not in Voice", "You need to be in a voice channel!")] });
        }

        const reply = await message.reply(`Loading a random mix...`);
        playRandom({ member: message.member, user: message.author, guild: message.guild, editReply: (opts) => reply.edit(opts) }, client);
    }
};

async function playRandom(context, client) {
    let player = client.manager.players.get(context.guild.id);

    if (!player) {
        try {
            player = await client.manager.createPlayer({
                guildId: context.guild.id,
                textId: context.channel?.id || context.member.voice.channel.id,
                voiceId: context.member.voice.channel.id,
                volume: config.player.defaultVolume,
                deaf: false
            });
        } catch (err) {
            return context.editReply({ embeds: [errorEmbed("Connection Error", "Could not join your voice channel. Check permissions!")] });
        }
    }

    try {
        const randomQuery = RANDOM_QUERIES[Math.floor(Math.random() * RANDOM_QUERIES.length)];
        
        // Kazagumo uses default youtube engine natively.
        // We append 'english' to bypass regional IP tracking smoothly.
        const result = await client.manager.search(`${randomQuery} english`, { 
            requester: context.user,
            engine: "youtube"
        });

        if (!result.tracks.length) {
            return context.editReply({ embeds: [errorEmbed("No Results", "Could not load the random playlist.")] });
        }

        // Enable autoplay for infinite seamless tracks
        player.data.set("autoplay", true);

        // Add all ~20 returned tracks from the algoritm
        for (const track of result.tracks) {
            player.queue.add(track);
        }

        // True randomization inside the queue
        player.queue.shuffle();
        
        context.editReply({ 
            embeds: [playlistAddedEmbed(
                `Random Mix: ${randomQuery}`, 
                result.tracks, 
                context.user
            )] 
        });

        if (!player.playing && !player.paused) {
            player.play();
        }
    } catch (err) {
        console.error("Random search error:", err);
        return context.editReply({ embeds: [errorEmbed("Search Failed", "An error occurred while loading infinite tracks.")] });
    }
}
