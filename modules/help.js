const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',

    execute: async (message, args) => {
        try {
            const prefix = '.'; 

            const mainText = `────────────────────────\n\n` +
                             `[Bot Website](https://discord-cookie.com)\n\n` +
                             `**Main Commands:**\n` +
                             `┃ \`${prefix}c hunt\` \`${prefix}c battle\` \`${prefix}c pray\` \`${prefix}c curse\` \`${prefix}c owo\``;

            const goalText = `────────────────────────\n\n` +
                             `[Bot Website](https://discord-cookie.com)\n\n` +
                             `**Goal Tracking:**\n` +
                             `┃ \`${prefix}goal\` — View your current progress and goals`;

            const reminderText = `────────────────────────\n\n` +
                                 `[Bot Website](https://discord-cookie.com)\n\n` +
                                 `**Custom Reminders:**\n` +
                                 `┃ \`${prefix}reminder\` — View reminder settings & active alerts\n` +
                                 `┃ \`${prefix}reminder msg <hb/pc/owo> <text>\` — Set custom alert text\n` +
                                 `┃ \`${prefix}reminder reset <hb/pc/owo/all>\` — Reset custom alert text`;

            const contents = {
                help_main: mainText,
                help_goals: goalText,
                help_reminders: reminderText
            };

            const buildV2Payload = (selectedKey = 'help_main', disabled = false) => {
                return {
                    flags: 32768, 
                    components: [
                        {
                            type: 17, // Container Component
                            accent_color: 14430780, 
                            components: [
                                {
                                    type: 1, // ActionRow (Menu placed first)
                                    components: [
                                        {
                                            type: 3, 
                                            custom_id: 'help_select_menu',
                                            placeholder: 'All quests list',
                                            disabled: disabled,
                                            options: [
                                                {
                                                    label: 'All quests list',
                                                    description: 'View main commands list',
                                                    value: 'help_main',
                                                    emoji: { name: '📜' },
                                                    default: selectedKey === 'help_main'
                                                },
                                                {
                                                    label: 'Goal Tracking',
                                                    description: 'View progress and goal tracking commands',
                                                    value: 'help_goals',
                                                    emoji: { name: '🎯' },
                                                    default: selectedKey === 'help_goals'
                                                },
                                                {
                                                    label: 'Custom Reminders',
                                                    description: 'View reminder configuration commands',
                                                    value: 'help_reminders',
                                                    emoji: { name: '⏰' },
                                                    default: selectedKey === 'help_reminders'
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    type: 10, // TextDisplay
                                    content: contents[selectedKey]
                                }
                            ]
                        }
                    ]
                };
            };

            const initialMessage = await message.channel.send(buildV2Payload('help_main', false));

            const collector = initialMessage.createMessageComponentCollector({ 
                time: 120000 
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
                }

                const selectedValue = interaction.values[0];
                await interaction.update(buildV2Payload(selectedValue, false));
            });

            collector.on('end', async () => {
                try {
                    await initialMessage.edit(buildV2Payload('help_main', true));
                } catch (err) {}
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
