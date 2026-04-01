const { SlashCommandBuilder } = require("discord.js");
const { errorEmbed, successEmbed, playlistAddedEmbed } = require("../../src/structures/EmbedBuilder");
const config = require("../../config");

// We generate 50 highly varied search queries per mood. 
// Lavalink will fetch the top 20-30 tracks for the chosen query dynamically,
// providing thousands of different combinations every single time.
const MOODS = {
    chill: {
        label: "Chill / Lofi ☕",
        queries: [
            "lofi hip hop radio mix", "chill beats to relax study", "lofi sleep playlist", "coffee shop lofi mix",
            "aesthetic lofi mix", "chill r&b mix 2024", "lofi guitar playlist", "japanese lofi mix",
            "midnight lofi vibes", "rainy day lofi chill", "chillhop music mix", "jazzhop lofi beats",
            "lofi piano mix relaxing", "sunday morning chill music", "ambient chillout mix", "bedroom pop chill",
            "lofi hip hop to study", "slowed + reverb chill songs", "sunset lofi mix", "lofi vocal mix chill",
            "chill synthwave mix", "lofi hiphop mix 2023", "lofi girl radio beats", "chillhop essentials",
            "lofi hiphop beat tape", "chill rap playlist soft", "lofi house mix deep", "neo soul lofi modern",
            "lofi beats to sleep", "morning coffee chill acoustic", "late night drive lofi", "lofi trap mix chill",
            "lofi anime mix opening", "lofi chillhop beats radio", "warm lofi mix cozy", "lofi hip hop sleep calm",
            "sad lofi mix emotional", "lofi nostalgia mix retro", "lofi hip hop classical", "lofi jazz relax",
            "lofi rain mix sleep", "lofi study mix focus", "lofi 1 hour mix", "lofi deep focus",
            "lofi instrumental beats", "lofi korean R&B mix", "lofi beat tape instrumental", "lofi radio live streams",
            "lofi girl study beats", "lofi hip hop fresh beats"
        ]
    },
    workout: {
        label: "Workout / Hype 🏋️",
        queries: [
            "gym hype music mix", "workout motivation songs", "hardstyle gym mix", "bass boosted workout mix",
            "phong gym mix", "hip hop workout mix", "heavy metal workout", "edm workout playlist",
            "trap workout mix", "running music mix fast", "cardio workout hits", "crossfit hype music",
            "gym rap playlist intense", "electronic workout beats", "gym drift phonk", "powerful workout mix",
            "beast mode gym mix", "pre-workout hype mix", "high energy workout edm", "workout rock mix",
            "gym hardstyle zyzz", "bodybuilding motivation music", "gym aggressive rap", "workout remix popular",
            "HIIT workout music", "boxing training mix", "mma hype walkout music", "workout pop remix mix",
            "lifting heavy gym playlist", "female fitness workout mix", "gym trap bass boosted", "motivation speech workout",
            "workout house music", "gym dubstep mix", "workout drum and bass", "gym techno mix",
            "workout trance mix", "gym hard rock playlist", "workout numetal mix", "gym phonk aggressive",
            "workout 180 bpm music", "gym 140 bpm mix", "workout electronic dance", "gym festival anthems",
            "workout summer mix", "gym epic orchestral hype", "workout drill rap", "gym uk drill mix",
            "workout modern rap mix", "gym legendary epic mix"
        ]
    },
    party: {
        label: "Party / Dance 🎉",
        queries: [
            "party playlist 2024", "dance hits mix", "club bangers playlist", "pop party anthems",
            "edm festival mix", "house music dance playlist", "party songs you know", "throwback party mix",
            "latin party hits", "reggaeton dance mix", "summer party playlist", "pool party mix",
            "wedding party dance songs", "tik tok dance hits", "hip hop club bangers", "r&b party classics",
            "90s dance hits mix", "2000s party hits", "party remix popular songs", "deep house party",
            "tech house club mix", "slap house party", "party mashup mix", "frat party playlist",
            "party rock anthems", "uk garage dance mix", "afrobeats party mix", "dancehall party hits",
            "electro swing party", "disco party classics", "funk party hits", "karaoke party playlist",
            "girls night out playlist", "pre-game party mix", "afterparty chill dance", "party edm drops",
            "festival big room mix", "party top 40 mix", "eurodance 90s party", "party pop punk",
            "Y2K party hits", "party dance pop", "beach party mix", "boat party house",
            "party bass house mix", "party future house", "dance pop anthems", "club hits 2024",
            "party remix pack", "party legendary bangers"
        ]
    },
    focus: {
        label: "Focus / Study 🧠",
        queries: [
            "study focus background music", "deep focus piano", "ambient study music", "binaural beats focus",
            "classical music for studying", "instrumental focus mix", "brain power study music", "reading music ambient",
            "focus lofi study", "concentration music soft", "white noise study focus", "alpha waves study",
            "cello study music", "mozart for studying", "hans zimmer study mix", "cinematic ambient focus",
            "coding music programming", "hacker background music", "cyberpunk ambient focus", "space ambient music",
            "nature sounds for studying", "rain sounds focus piano", "soft piano study", "acoustic guitar focus",
            "jazz for studying", "dark academia classical", "light academia study music", "cafe background noise focus",
            "library ambient study", "meditation focus music", "yoga background music calm", "zen study music",
            "focus flow state music", "minimalist piano study", "drone ambient focus", "gregorian chants study",
            "celtic ambient focus", "lofi chill study beats", "atmospheric focus music", "soundtrack study mix",
            "video game ost focus", "skyrim ambient study", "minecraft ost study", "nintendo relax study",
            "focus beats no lyrics", "study session 2 hours", "deep work music mix", "pomodoro study playlist",
            "focus instrumental pop", "relaxing study focus mix"
        ]
    },
    gaming: {
        label: "Gaming / EDM 🎮",
        queries: [
            "gaming music mix 2024", "epic gaming edm", "bass boosted gaming phonk", "valorant gaming mix",
            "league of legends hype", "csgo gaming playlist", "fortnite gaming songs", "rocket league edm",
            "apex legends gaming mix", "call of duty multiplayer mix", "gaming dubstep drops", "gaming drum and bass",
            "gaming trap music", "gaming electro house", "synthwave gaming mix", "cyberpunk gaming playlist",
            "gaming hardstyle mix", "nightcore gaming mix", "gaming rock hype", "gaming glitch hop",
            "gaming chill lounge", "ncs gaming music mix", "monstercat gaming mix", "gaming future bass",
            "gaming chillstep", "lofi gaming mix", "rage gaming heavy", "chill gaming background",
            "gaming phonk drift", "gaming midtempo bass", "gaming techno underground", "gaming trance anthems",
            "streamer background music", "twitch safe gaming music", "royalty free gaming mix", "gaming synth pop",
            "retro gaming chiptune", "8 bit gaming mix", "gaming epic orchestral", "boss battle music mix",
            "gaming competitive mix", "esports tournament music", "gaming hype bangers", "gaming chill phonk",
            "gaming deep house", "gaming slap house", "gaming popular remixes", "gaming bass drops",
            "gaming vocal edm", "gaming ultimate mix"
        ]
    }
};

module.exports = {
    aliases: ["m", "vibe"],
    data: new SlashCommandBuilder()
        .setName("mood")
        .setDescription("Play a music mix based on your mood")
        .addStringOption(option => {
            option.setName("mood")
                .setDescription("Select your vibe")
                .setRequired(true);

            const choices = Object.entries(MOODS).map(([key, val]) => ({
                name: val.label,
                value: key,
            }));

            option.addChoices(...choices);
            return option;
        }),

    async execute(interaction, client) {
        if (!interaction.member.voice.channel) {
            return interaction.reply({ embeds: [errorEmbed("Not in Voice", "You need to be in a voice channel!")], ephemeral: true });
        }

        const moodKey = interaction.options.getString("mood");
        const mood = MOODS[moodKey];

        if (!mood) {
            return interaction.reply({ embeds: [errorEmbed("Invalid Mood", "Please select a valid mood.")], ephemeral: true });
        }

        await interaction.deferReply();
        playMood(mood, { member: interaction.member, user: interaction.user, guild: interaction.guild, editReply: (opts) => interaction.editReply(opts) }, client);
    },

    async prefixExecute(message, args, client) {
        if (!message.member.voice.channel) {
            return message.reply({ embeds: [errorEmbed("Not in Voice", "You need to be in a voice channel!")] });
        }

        const moodKey = args[0]?.toLowerCase();
        const mood = MOODS[moodKey];

        if (!mood) {
            const list = Object.entries(MOODS).map(([k, v]) => `\`${k}\` — ${v.label}`).join("\n");
            return message.reply({
                embeds: [errorEmbed("Select a Mood", `Please specify a valid mood:\n\n${list}\n\nExample: \`!mood chill\``)]
            });
        }

        const reply = await message.reply(`Loading **${mood.label}** mix...`);
        playMood(mood, { member: message.member, user: message.author, guild: message.guild, editReply: (opts) => reply.edit(opts) }, client);
    }
};

// ── Core Logic ──────────────────────────────────────
async function playMood(mood, context, client) {
    let player = client.manager.players.get(context.guild.id);

    if (!player) {
        try {
            player = await client.manager.createPlayer({
                guildId: context.guild.id,
                textId: context.channel?.id || context.member.voice.channel.id, // fallback for prefix
                voiceId: context.member.voice.channel.id,
                volume: config.player.defaultVolume,
                deaf: false
            });
        } catch (err) {
            return context.editReply({ embeds: [errorEmbed("Connection Error", "Could not join your voice channel. Check permissions!")] });
        }
    }

    try {
        // Pick 1 of the 50 random search queries for this mood
        const randomQuery = mood.queries[Math.floor(Math.random() * mood.queries.length)];
        
        // Kazagumo uses default youtube engine natively.
        // We append 'english' to bypass regional IP tracking smoothly.
        const result = await client.manager.search(`${randomQuery} english`, { 
            requester: context.user,
            engine: "youtube" 
        });

        if (!result.tracks.length) {
            return context.editReply({ embeds: [errorEmbed("No Results", "YouTube Music returned no results right now. Try again!")] });
        }

        // We enable "autoplay" automatically for mood radios so it perfectly transitions into infinite music after the 20 batch tracks are done
        player.data.set("autoplay", true);

        // Add all ~20 returned tracks from the YouTube Music algorithm
        for (const track of result.tracks) {
            player.queue.add(track);
        }

        // Shuffle them beautifully
        player.queue.shuffle();

        context.editReply({ 
            embeds: [playlistAddedEmbed(
                `${mood.label} Mix`, 
                result.tracks, 
                context.user
            )] 
        });
        
        if (!player.playing && !player.paused) {
            player.play();
        }
    } catch (err) {
        console.error("Mood search error:", err);
        return context.editReply({ embeds: [errorEmbed("Search Failed", "An error occurred while loading the mood station.")] });
    }
}
