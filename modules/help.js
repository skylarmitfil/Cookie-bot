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
            // 1. Construct the Rich Menu Embed
            const helpEmbed = new EmbedBuilder()
                .setColor('#2F3136') // Dark sleek sidebar color match
                .setAuthor({ 
                    name: `${message.client.user.username}'s command list`, 
                    iconURL: message.client.user.displayAvatarURL()
                })
                .setDescription(
                    `Use \`${prefix}help {command}\` for more help.\n` +
                    `📢 **Check our latest updates:** \`${prefix}news\`\n` +
                    `[Support server](https://discord.gg/nPej3j4Xh5) | [Bot Wiki](discord-cookie.com)\n\n` +
                    `**Active Trackers:**\n` +
                    `┃ \`${prefix}hunt\` \`${prefix}pray\` \`${prefix}owo\``
                );

            // 2. Row 1 Buttons: Core Systems
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('bot_reminders')
                    .setLabel('Reminders')
                    .setEmoji('🏓')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('bot_stats')
                    .setLabel('Stats')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('bot_config')
                    .setLabel('Settings')
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Secondary)
            );

            // 3. Send package layout directly to channel
            await message.channel.send({
                embeds: [helpEmbed],
                components: [row1]
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};

