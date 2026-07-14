const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
// Import preferences data tools (Assumes help.js and userPreferences.js are in the same folder)
const preferencesModule = require('./userPreferences.js'); 

module.exports = {
    name: 'help',
    /**
     * Executes when a user triggers the help command (.help)
     */
    execute: async (message, prefix) => {
        if (!message.content.startsWith(`${prefix}help`)) return;

        try {
            const userId = message.author.id;
            const avatarURL = message.author.displayAvatarURL({ forceStatic: false, size: 256 });
            
            // Initial viewing category
            let currentCategory = 'Hunt/Battle'; 

            const generateHelpPayload = (category) => {
                // Fetch the standard layout from our data management file
                const basePayload = preferencesModule.buildConfigPayload(userId, category, avatarURL);
                const embed = basePayload.embeds[0]; 
                const toggleButtonsRow = basePayload.components[0]; 

                // Build top navigation menu matching Pookie Bot's style
                const dropdownMenu = new StringSelectMenuBuilder()
                    .setCustomId(`help_nav_menu_${userId}`)
                    .setPlaceholder('📜 Choose settings category to edit...')
                    .addOptions([
                        { 
                            label: 'Hunt / Battle', 
                            value: 'Hunt/Battle', 
                            description: 'Configure hunt and battle reminders', 
                            emoji: '⚔️',
                            default: category === 'Hunt/Battle'
                        },
                        { 
                            label: 'Pray / Curse', 
                            value: 'Pray/Curse', 
                            description: 'Configure pray and curse reminders', 
                            emoji: '🙏',
                            default: category === 'Pray/Curse'
                        },
                        { 
                            label: 'OwO / UwU', 
                            value: 'OwO', 
                            description: 'Configure owo and uwu action reminders', 
                            emoji: '✨',
                            default: category === 'OwO'
                        }
                    ]);
                const dropdownRow = new ActionRowBuilder().addComponents(dropdownMenu);

                embed.setTitle(`${message.author.username}'s Help & Configuration`);
                embed.setDescription(
                    `🔗 **[Support Server](https://discord.gg)** | 📖 **[Bot Wiki](https://discord-cookie.com)**\n` +
                    `*+:...oo━━━━━━━ Help Menu ━━━━━━━oo...:+*\n\n` +
                    `**Main commands:**\n` +
                    `┃ \`${prefix}r hunt\` \`${prefix}r pray\` \`${prefix}r owo\`\n\n` +
                    `**Active Category Status:** (${category === 'OwO' ? 'OwO/UwU' : category})\n` +
                    `${embed.data.description}\n\n` +
                    `*+:...oo━━━━━━━━━━━━━━━━━━━━━━oo...:+*`
                );

                // Forces dropdown directly into the top components slot under the text frame
                return {
                    embeds: [embed],
                    components: [dropdownRow, toggleButtonsRow]
                };
            };

            let payload = generateHelpPayload(currentCategory);
            const menuMessage = await message.channel.send(payload);

            const collector = menuMessage.createMessageComponentCollector({ idle: 45000 });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== userId) {
                    return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
                }

                // Handle category switches on dropdown changes
                if (interaction.isStringSelectMenu() && interaction.customId.startsWith('help_nav_menu_')) {
                    currentCategory = interaction.values[0]; 
                }

                // Handle button toggles underneath the dropdown menu
                if (interaction.isButton() && interaction.customId.startsWith('r_toggle_')) {
                    const buttonParts = interaction.customId.split('_');
                    const targetCat = buttonParts[2];     // e.g., 'Hunt/Battle'
                    const settingKey = buttonParts[3];    // e.g., 'enabled'

                    // Fetch user settings config mapping directly from preference module hooks
                    const userConfig = preferencesModule.getOrCreateUserConfig(userId);
                    
                    // Invert setting value, toggle state, and write instantly to persistent disk file
                    userConfig[targetCat][settingKey] = !userConfig[targetCat][settingKey];
                    preferencesModule.saveSettingsData();
                }

                const updatedPayload = generateHelpPayload(currentCategory);
                await interaction.update(updatedPayload);
            });

            collector.on('end', () => {
                menuMessage.delete().catch(() => {});
                message.delete().catch(() => {});
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
