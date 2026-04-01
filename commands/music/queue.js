const { SlashCommandBuilder } = require("discord.js");
const { queueEmbed, queueButtons, errorEmbed } = require("../../src/structures/EmbedBuilder");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("queue")
        .setDescription("Show the current music queue")
        .addIntegerOption(option =>
            option
                .setName("page")
                .setDescription("Page number to display")
                .setMinValue(1)
        ),

    async execute(interaction, client) {
        const player = client.manager.players.get(interaction.guildId);

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed("Empty Queue", "There's nothing in the queue. Use `/play` to add tracks!")],
                ephemeral: true,
            });
        }

        const page = (interaction.options.getInteger("page") || 1) - 1;
        await this.showQueuePage(interaction, client, page);
    },

    /**
     * Show a specific queue page (used by both slash command and button navigation).
     */
    async showQueuePage(interaction, client, page) {
        const player = client.manager.players.get(interaction.guildId);

        if (!player || !player.queue.current) {
            const embed = errorEmbed("Empty Queue", "The queue is empty.");
            if (interaction.replied || interaction.deferred) {
                return interaction.followUp({ embeds: [embed], ephemeral: true }).catch(() => {});
            }
            return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }

        const tracksPerPage = 10;
        const queue = [...player.queue]; // Convert to array
        const totalPages = Math.max(1, Math.ceil(queue.length / tracksPerPage));
        const safePage = Math.max(0, Math.min(page, totalPages - 1));

        const embed = queueEmbed(queue, player.queue.current, safePage, totalPages);
        const buttons = queueButtons(safePage, totalPages);

        const payload = {
            embeds: [embed],
            components: totalPages > 1 ? [buttons] : [],
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.update(payload).catch(() => {
                interaction.editReply(payload).catch(() => {});
            });
        } else {
            await interaction.reply(payload);
        }
    },

    async prefixExecute(message, args, client) {
        const player = client.manager.players.get(message.guild.id);
        if (!player || !player.queue.current) {
            return message.reply({ embeds: [errorEmbed("Empty Queue", "The queue is empty.")] });
        }

        const page = Math.max(0, (parseInt(args[0]) || 1) - 1);
        const tracksPerPage = 10;
        const queue = [...player.queue];
        const totalPages = Math.max(1, Math.ceil(queue.length / tracksPerPage));
        const safePage = Math.min(page, totalPages - 1);

        const embed = queueEmbed(queue, player.queue.current, safePage, totalPages);
        const buttons = queueButtons(safePage, totalPages);

        message.reply({
            embeds: [embed],
            components: totalPages > 1 ? [buttons] : [],
        });
    },
};
