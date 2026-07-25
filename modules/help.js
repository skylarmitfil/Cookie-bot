const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',

    execute: async (message, args) => {
        try {
            const prefix = '.'; 

            const mainText = `[Bot Website](https://discord-cookie.com)\n\n` +
                             `**Main Commands:**\n` +
                             `┃ \`${prefix}c hunt\` \`${prefix}c battle\` \`${prefix}c pray\` \`${prefix}c curse\` \`${prefix}c owo\``;

            const goalText = `[Bot Website](https://discord-cookie.com)\n\n` +
                             `**Goal Tracking:**\n` +
                             `┃ \`${prefix}goal\` — View your current progress and goals`;

            const reminderText = `[Bot Website](https://discord-cookie.com)\n\n` +
                                 `**Custom Reminders:**\n` +
                                 `┃ \`${prefix}reminder\` — View reminder settings & active alerts\n` +
                                 `┃ \`${prefix}reminder msg <hb/pc/owo> <text>\` — Set custom alert text\n` +
                                 `┃ \`${prefix}reminder reset <hb/pc/owo/all>\` — Reset custom alert text`;

            const contents = {
                help_main: mainText,
                help_goals: goalText,
                help_reminders: reminderText
            };

            // V2 Container Layout Payload using raw component blocks
            const buildPayload = (selectedKey = 'help_main', disabled = false) => {
                return {
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#DC143C')
                            .setAuthor({ 
                                name: `${message.client.user.username}'s command list`, 
                                iconURL: message.client.user.displayAvatarURL() 
                            })
                            .setDescription(contents[selectedKey])
                    ],
                    components: [
                        {
                            type: 1, // ActionRow
                            components: [
                                {
                                    type: 3, // String Select Menu
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
                        }
                    ]
                };
            };

            const initialMessage = await message.channel.send(buildPayload('help_main', false));

            const collector = initialMessage.createMessageComponentCollector({ 
                time: 120000 
            });

            collector.on('collect', async (interaction) => {
                if (interaction.user.id !== message.author.id) {
                    return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
                }

                const selectedValue = interaction.values[0];
                await interaction.update(buildPayload(selectedValue, false));
            });

            collector.on('end', async () => {
                try {
                    await initialMessage.edit(buildPayload('help_main', true));
                } catch (err) {}
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
