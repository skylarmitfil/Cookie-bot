const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'help',

    /**
     * Executes when a user triggers the help command
     */
    execute: async (message, prefix) => {
        // Enforce prefix matching (e.g., .help)
        if (!message.content.startsWith(`${prefix}help`)) return;

        try {
            // 1. Construct the Rich Menu Embed with a Crimson border color
            const helpEmbed = new EmbedBuilder()
                .setColor('#DC143C') // Sets the embed stripe color to Crimson
                .setAuthor({ 
                    name: `${message.client.user.username}'s command list`, 
                    iconURL: message.client.user.displayAvatarURL()
                })
                .setDescription(
                    `Use \`${prefix}help {command}\` for more help.\n` +
                    `📢 **Check our latest bot updates:** \`${prefix}news\`\n` +
                    `[Support server](https://discord.gg) | [Bot Wiki](https://discord-cookie.com) | [Donate](https://example.com)\n\n` +
                    `**Main commands:**\n` +
                    `┃ \`${prefix}hunt\` \`${prefix}pray\` \`${prefix}owo\``
                );

            // 2. Row 1 Buttons (Matches the top section of buttons)
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('help_reminders')
                    .setLabel('Reminders')
                    .setEmoji('🏓')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_util')
                    .setLabel('Util')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_stats')
                    .setLabel('Stats')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_counting')
                    .setLabel('Counting')
                    .setEmoji('🥇')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_fun')
                    .setLabel('Fun')
                    .setEmoji('😃')
                    .setStyle(ButtonStyle.Secondary)
            );

            // 3. Row 2 Buttons (Matches the bottom section of system toggles)
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('help_reaction_general')
                    .setLabel('Reaction: general')
                    .setEmoji('🤖')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_reaction_config')
                    .setLabel('Reaction: config')
                    .setEmoji('📎')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('help_reaction_misc')
                    .setLabel('Reaction: misc')
                    .setEmoji('⭐')
                    .setStyle(ButtonStyle.Secondary)
            );

            // 4. Send the complete package directly to the channel
            await message.channel.send({
                embeds: [helpEmbed],
                components: [row1, row2]
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
