const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'help',

    execute: async (message, args) => {
        try {
            const prefix = '.'; 

            // Define the different pages/embeds
            const mainEmbed = new EmbedBuilder()
                .setColor('#DC143C') 
                .setAuthor({ 
                    name: `${message.client.user.username}'s command list`, 
                    iconURL: message.client.user.displayAvatarURL() 
                })
                .setDescription(
                    `[Bot Website](https://discord-cookie.com)\n\n` +
                    `**Main Commands:**\n` +
                    `┃ \`${prefix}c hunt\` \`${prefix}c battle\` \`${prefix}c pray\` \`${prefix}c curse\` \`${prefix}c owo\``
                )
                .setFooter({ text: 'Select a category from the dropdown menu below.' });

            const goalEmbed = new EmbedBuilder()
                .setColor('#DC143C') 
                .setAuthor({ 
                    name: `${message.client.user.username}'s command list`, 
                    iconURL: message.client.user.displayAvatarURL() 
                })
                .setDescription(
                    `[Bot Website](https://discord-cookie.com)\n\n` +
                    `**Goal Tracking:**\n` +
                    `┃ \`${prefix}goal\` — View your current progress and goals`
                )
                .setFooter({ text: 'Select a category from the dropdown menu below.' });

            const reminderEmbed = new EmbedBuilder()
                .setColor('#DC143C') 
                .setAuthor({ 
                    name: `${message.client.user.username}'s command list`, 
                    iconURL: message.client.user.displayAvatarURL() 
                })
                .setDescription(
                    `[Bot Website](https://discord-cookie.com)\n\n` +
                    `**Custom Reminders:**\n` +
                    `┃ \`${prefix}reminder\` — View reminder settings & active alerts\n` +
                    `┃ \`${prefix}reminder msg <hb/pc/owo> <text>\` — Set custom alert text\n` +
                    `┃ \`${prefix}reminder reset <hb/pc/owo/all>\` — Reset custom alert text`
                )
                .setFooter({ text: 'Select a category from the dropdown menu below.' });

            const embeds = {
                help_main: mainEmbed,
                help_goals: goalEmbed,
                help_reminders: reminderEmbed
            };

            // Create select menu component
            const createMenu = (disabled = false) => {
                return new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('help_select_menu')
                        .setPlaceholder('📂 Choose a command category...')
                        .setDisabled(disabled)
                        .addOptions([
                            {
                                label: 'Main Commands',
                                description: 'View primary OwO action commands',
                                value: 'help_main',
                                emoji: '🏠'
                            },
                            {
                                label: 'Goal Tracking',
                                description: 'View progress and goal tracking commands',
                                value: 'help_goals',
                                emoji: '🎯'
                            },
                            {
                                label: 'Custom Reminders',
                                description: 'View reminder configuration commands',
                                value: 'help_reminders',
                                emoji: '⏰'
                            }
                        ])
                );
            };

            const initialMessage = await message.channel.send({ 
                embeds: [mainEmbed], 
                components: [createMenu()] 
            });

            // Create a collector for component interactions (lasts for 2 minutes)
            const collector = initialMessage.createMessageComponentCollector({ 
                time: 120000 
            });

            collector.on('collect', async (interaction) => {
                // Ensure only the user who typed the command can use the menu
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
                }

                const selectedValue = interaction.values[0];
                const targetEmbed = embeds[selectedValue] || mainEmbed;

                await interaction.update({ 
                    embeds: [targetEmbed], 
                    components: [createMenu()] 
                });
            });

            collector.on('end', async () => {
                try {
                    // Disable select menu after timeout
                    await initialMessage.edit({ components: [createMenu(true)] });
                } catch (err) {
                    // Ignore errors if message was deleted
                }
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
