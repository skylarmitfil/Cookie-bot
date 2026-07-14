const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
// Import preferences (Make sure userPreferences.js is in the same directory folder)
const preferencesModule = require('./userPreferences.js'); 

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
            const avatarURL = message.author.displayAvatarURL({ forceStatic: false, size: 256 });
            
            // Track which category the user is actively viewing (Default: Hunt/Battle)
            let currentCategory = 'Hunt/Battle'; 

            // Inner helper to construct the combined embed and layout grid
            const generateHelpPayload = (category) => {
                // 1. Fetch the base preference payload (returns { embeds: [...], components: [...] })
                const basePayload = preferencesModule.buildConfigPayload(userId, category, avatarURL);
                const embed = basePayload.embeds[0];
                const toggleButtonsRow = basePayload.components[0];

                // 2. Build the top Select Menu Navigation component matching the screenshots
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

                // 3. Customize the main help documentation strings inside the description window
                embed.setTitle(`${message.author.username}'s Help & Configuration`);
                embed.setDescription(
                    `🔗 **[Support Server] (https://discord.gg/nPej3j4Xh5)** | 📖 **[Bot Wiki](https://discord-cookie.com)**\n` +
                    `*+:...oo━━━━━━━ Help Menu ━━━━━━━oo...:+*\n\n` +
                    `**Main commands:**\n` +
                    `┃ \`${prefix}r hunt\` \`${prefix}r pray\` \`${prefix}r owo\`\n\n` +
                    `**Active Category Status:** (${category === 'OwO' ? 'OwO/UwU' : category})\n` +
                    `${embed.data.description}\n\n` +
                    `*+:...oo━━━━━━━━━━━━━━━━━━━━━━oo...:+*`
                );

                // 4. Return the visual components stacked from top to bottom
                return {
                    embeds: [embed],
                    components: [dropdownRow, toggleButtonsRow]
                };
            };

            // Send initial layout configuration package
            let payload = generateHelpPayload(currentCategory);
            const menuMessage = await message.channel.send(payload);

            // Open an interactive component collector loop
            const collector = menuMessage.createMessageComponentCollector({ idle: 45000 });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== userId) {
                    return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
                }

                // --- INTERACTION TYPE 1: User switches menus using the top dropdown component ---
                if (interaction.isStringSelectMenu() && interaction.customId.startsWith('help_nav_menu_')) {
                    currentCategory = interaction.values[0]; // Set active target category state
                }

                // --- INTERACTION TYPE 2: User clicks toggle buttons below the menu box ---
                if (interaction.isButton() && interaction.customId.startsWith('r_toggle_')) {
                    const parts = interaction.customId.split('_');
                    const category = parts[2];
                    const settingKey = parts[3];

                    // Safely route the value flip directly into your userPreferences engine mapping
                    const userConfig = preferencesModule.getSetting(userId, category, settingKey);
                }

                // Re-evaluate current preference positions and render refreshed framework updates
                const updatedPayload = generateHelpPayload(currentCategory);
                await interaction.update(updatedPayload);
            });

            collector.on('end', () => {
                // Delete active components out of channel arrays upon collector expiration
                menuMessage.delete().catch(() => {});
                message.delete().catch(() => {});
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
