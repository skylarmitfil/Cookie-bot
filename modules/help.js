const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const preferencesModule = require('./userPreferences.js'); 

module.exports = {
    name: 'help',
    /**
     * Executes when a user triggers the help command
     */
    execute: async (message, prefix) => {
        if (!message.content.startsWith(`${prefix}help`)) return;

        try {
            const userId = message.author.id;
            const avatarURL = message.author.displayAvatarURL({ forceStatic: false, size: 256 });
            
            // Set initial state
            let currentCategory = 'Hunt/Battle'; 

            const generateHelpPayload = (category) => {
                const basePayload = preferencesModule.buildConfigPayload(userId, category, avatarURL);
                const embed = basePayload.embeds[0]; // Extracting index 0 explicitly from array
                const toggleButtonsRow = basePayload.components[0]; // Extract button components row

                // Build top navigation menu
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

                // FIX 1: Extract string value directly out of the select array data context
                if (interaction.isStringSelectMenu() && interaction.customId.startsWith('help_nav_menu_')) {
                    currentCategory = interaction.values[0]; 
                }

                // FIX 2: Fixed variable parsing logic for toggle components execution mapping
                if (interaction.isButton() && interaction.customId.startsWith('r_toggle_')) {
                    const buttonParts = interaction.customId.split('_');
                    const category = buttonParts[2];
                    const settingKey = buttonParts[3];

                    // Flips preference states seamlessly on the data engine context layer
                    preferencesModule.getSetting(userId, category, settingKey);
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
