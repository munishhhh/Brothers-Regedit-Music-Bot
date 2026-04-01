const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../../src/utils/db");
const { errorEmbed, successEmbed, playlistAddedEmbed } = require("../../src/structures/EmbedBuilder");
const config = require("../../config");

module.exports = {
    aliases: ["liked", "favorites"],
    data: new SlashCommandBuilder()
        .setName("fav")
        .setDescription("Manage your personal favorite tracks")
        .addSubcommand(sub => 
            sub.setName("list")
            .setDescription("View your saved favorites")
        )
        .addSubcommand(sub => 
            sub.setName("play")
            .setDescription("Play all your saved favorites")
        )
        .addSubcommand(sub => 
            sub.setName("remove")
            .setDescription("Remove a track from your favorites")
            .addStringOption(opt => 
                opt.setName("query")
                .setDescription("The track title or number in your list to remove")
                .setRequired(true)
            )
        ),

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const favs = db.getFavorites(userId);

        if (sub === "list") {
            if (!favs || favs.length === 0) {
                return interaction.reply({
                    embeds: [errorEmbed("No Favorites", "You haven't saved any tracks yet! Click the ❤️ button while a song is playing.")],
                    ephemeral: true
                });
            }

            const description = favs.map((t, i) => `**${i + 1}.** [${t.title}](${t.uri})`).join("\n").substring(0, 4000);
            
            const embed = new EmbedBuilder()
                .setColor(config.colors.main)
                .setAuthor({ name: `${interaction.user.username}'s Favorites ❤️`, iconURL: interaction.user.displayAvatarURL() })
                .setDescription(description)
                .setFooter({ text: `${favs.length} tracks total` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === "remove") {
            const query = interaction.options.getString("query");
            const removed = db.removeFavoriteByTitle(userId, query);

            if (removed) {
                return interaction.reply({
                    embeds: [successEmbed("Removed", `Successfully removed that track from your favorites.`)],
                    ephemeral: true
                });
            } else {
                return interaction.reply({
                    embeds: [errorEmbed("Not Found", `Could not find track matching \`${query}\` in your favorites.`)],
                    ephemeral: true
                });
            }
        }

        if (sub === "play") {
            if (!favs || favs.length === 0) {
                return interaction.reply({
                    embeds: [errorEmbed("No Favorites", "You haven't saved any tracks yet!")],
                    ephemeral: true
                });
            }

            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    embeds: [errorEmbed("Not in Voice", "You need to be in a voice channel first!")],
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            let player = client.manager.players.get(interaction.guild.id);
            if (!player) {
                try {
                    player = await client.manager.createPlayer({
                        guildId: interaction.guild.id,
                        textId: interaction.channelId,
                        voiceId: voiceChannel.id,
                        volume: config.player.defaultVolume,
                        deaf: false
                    });
                } catch (err) {
                    return interaction.editReply({ embeds: [errorEmbed("Connection Error", "Could not join your VC.")] });
                }
            }

            let resolvedTracks = [];
            for (const track of favs) {
                // To play them natively, we just resolve their stored URIs again. 
                // Since they were already exact videos/songs, they will load easily.
                const res = await client.manager.search(track.uri, { requester: interaction.user });
                if (res && res.tracks && res.tracks.length > 0) {
                    resolvedTracks.push(res.tracks[0]);
                    player.queue.add(res.tracks[0]);
                }
            }

            if (resolvedTracks.length === 0) {
                return interaction.editReply({ embeds: [errorEmbed("Error", "Could not load any of your favorite tracks.")] });
            }

            interaction.editReply({
                embeds: [playlistAddedEmbed("❤️ Your Favorites", resolvedTracks, interaction.user)]
            });

            if (!player.playing && !player.paused) {
                player.play();
            }
        }
    },

    // ── Prefix version fallback ─────────────────────────────────────
    async prefixExecute(message, args, client) {
        const userId = message.author.id;
        const favs = db.getFavorites(userId);
        const sub = args[0]?.toLowerCase();

        if (!sub || sub === "list") {
            if (!favs || favs.length === 0) return message.reply({ embeds: [errorEmbed("No Favorites", "You haven't saved any tracks yet!")] });
            const description = favs.map((t, i) => `**${i + 1}.** [${t.title}](${t.uri})`).join("\n").substring(0, 4000);
            return message.reply({
                embeds: [new EmbedBuilder().setColor(config.colors.main).setTitle(`❤️ Liked Songs (${favs.length})`).setDescription(description)]
            });
        }

        if (sub === "play") {
            if (!favs || favs.length === 0) return message.reply({ embeds: [errorEmbed("No Favorites", "You haven't saved any tracks yet!")] });
            if (!message.member.voice.channel) return message.reply("You need to be in a voice channel!");
            
            const reply = await message.reply("⏳ Loading your incredibly curated favorites...");
            
            let player = client.manager.players.get(message.guild.id);
            if (!player) {
                player = await client.manager.createPlayer({
                    guildId: message.guild.id,
                    textId: message.channelId,
                    voiceId: message.member.voice.channel.id,
                    volume: 80, deaf: false
                });
            }

            let resolvedTracks = [];
            for (const track of favs) {
                const res = await client.manager.search(track.uri, { requester: message.author });
                if (res?.tracks?.length > 0) {
                    resolvedTracks.push(res.tracks[0]);
                    player.queue.add(res.tracks[0]);
                }
            }

            reply.edit({ embeds: [playlistAddedEmbed("❤️ Your Favorites", resolvedTracks, message.author)] });
            if (!player.playing && !player.paused) player.play();
        }

        if (sub === "remove" && args[1]) {
            const query = args.slice(1).join(" ");
            const removed = db.removeFavoriteByTitle(userId, query);
            message.reply(removed ? "✅ Removed from favorites!" : "❌ Could not find that track in your favorites.");
        }
    }
};
