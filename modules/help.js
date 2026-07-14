const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    /**
     * Executes when a user triggers the help command
     */
    execute: async (message, prefix) => {
        // Enforce prefix matching (e.g., .help)
        if (!message.content.startsWith(`${prefix}help`)) return;

        try {
            const userId = message.author.id;

            // Construct the clean Crimson Help Embed
            const helpEmbed = new EmbedBuilder()
                .setColor('#DC143C') // Solid Crimson sidebar stripe
                .setAuthor({ name: `${message.client.user.username}'s command list`, iconURL: message.client.user.displayAvatarURL() })
                .setDescription(
                    `[Support server](https://discord.gg) | [Bot Wiki](https://discord-cookie.com)\n\n` +
                    `**Main commands:**\n` +
                    `┃ \`${prefix}r hunt\` \`${prefix}r pray\` \`${prefix}r owo\``
                );

            // Build the Top Navigation Dropdown Component with your 3 categories
            const dropdownMenu = new StringSelectMenuBuilder()
                .setCustomId(`help_nav_menu_${userId}`)
                .setPlaceholder('📜 Choose settings category to edit...')
                .addOptions([
                    { 
                        label: 'Hunt / Battle', 
                        value: 'Hunt/Battle', 
                        description: 'Configure hunt and battle reminders', 
                        emoji: '⚔️'
                    },
                    { 
                        label: 'Pray / Curse', 
                        value: 'Pray/Curse', 
                        description: 'Configure pray and curse reminders', 
                        emoji: '🙏'
                    },
                    { 
                        label: 'OwO / UwU', 
                        value: 'OwO', 
                        description: 'Configure owo and uwu action reminders', 
                        emoji: '✨'
                    }
                ]);
            const dropdownRow = new ActionRowBuilder().addComponents(dropdownMenu);

            // Send the embed with ONLY the select menu component attached
            await message.channel.send({ 
                embeds: [helpEmbed], 
                components: [dropdownRow] 
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
