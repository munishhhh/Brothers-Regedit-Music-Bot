const { SlashCommandBuilder, ActivityType } = require("discord.js");
const { successEmbed, errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    aliases: ["activity", "botstatus"],
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Set a custom bot status/activity (Admin Only)")
        .addStringOption(opt =>
            opt.setName("type")
            .setDescription("The type of activity")
            .setRequired(true)
            .addChoices(
                { name: "Playing", value: "Playing" },
                { name: "Listening to", value: "Listening" },
                { name: "Watching", value: "Watching" },
                { name: "Competing in", value: "Competing" },
                { name: "Reset to Default", value: "Reset" }
            )
        )
        .addStringOption(opt =>
            opt.setName("text")
            .setDescription("The text to display after the activity type (Not required if Reset)")
            .setRequired(false)
        ),

    async execute(interaction, client) {
        if (!interaction.member.permissions.has("Administrator")) {
            return interaction.reply({
                embeds: [errorEmbed("Missing Permissions", "Only Administrators can change the bot's status.")],
                ephemeral: true
            });
        }

        const type = interaction.options.getString("type");
        const text = interaction.options.getString("text");

        if (type === "Reset") {
            client.customStatusOverride = null;
            return interaction.reply({
                embeds: [successEmbed("Status Reset", "Bot activity has been reset to default cinematic rotation.")]
            });
        }

        if (!text) {
            return interaction.reply({
                embeds: [errorEmbed("Missing Text", "You must provide text for the custom status.")],
                ephemeral: true
            });
        }

        const activityTypes = {
            "Playing": ActivityType.Playing,
            "Listening": ActivityType.Listening,
            "Watching": ActivityType.Watching,
            "Competing": ActivityType.Competing
        };

        client.customStatusOverride = {
            name: text,
            type: activityTypes[type]
        };

        client.user.setActivity(text, { type: activityTypes[type] });

        return interaction.reply({
            embeds: [successEmbed("Status Updated", `Successfully changed the bot's status to **${type} ${text}**`)]
        });
    },

    async prefixExecute(message, args, client) {
        if (!message.member.permissions.has("Administrator")) {
            return message.reply({ embeds: [errorEmbed("Missing Permissions", "Only Administrators can change the bot's status.")] });
        }

        const typeStr = args[0]?.toLowerCase();
        
        if (typeStr === "reset") {
            client.customStatusOverride = null;
            return message.reply({ embeds: [successEmbed("Status Reset", "Bot activity has been reset to default cinematic rotation.")] });
        }

        const text = args.slice(1).join(" ");
        if (!typeStr || !text) {
            return message.reply("Usage: `!status [playing/listening/watching/competing/reset] [text]`");
        }

        const types = {
            "playing": ActivityType.Playing,
            "listening": ActivityType.Listening,
            "watching": ActivityType.Watching,
            "competing": ActivityType.Competing
        };

        if (!types[typeStr]) return message.reply("Invalid type! Choose `playing`, `listening`, `watching`, or `competing`.");

        client.customStatusOverride = { name: text, type: types[typeStr] };
        client.user.setActivity(text, { type: types[typeStr] });

        return message.reply(`✅ Successfully changed bot status to **${typeStr.charAt(0).toUpperCase() + typeStr.slice(1)} ${text}**`);
    }
};
