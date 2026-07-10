const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const disabledUsers = new Map();

module.exports = {
    name: 'userPreferences',
    
    isUserDisabled(userId) {
        return disabledUsers.has(userId);
    },

    async execute(message) {
        const content = message.content.toLowerCase().trim();
        if (content !== 'owo remind' && content !== 'oworemind') return;

        const userId = message.author.id;

        const mainEmbed = new EmbedBuilder()
            .setTitle('OwO Reminder Settings')
            .setDescription('Click the buttons below to control your automated grinding notifications.')
            .setColor(0xDC143C)
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`enable_${userId}`)
                .setLabel('Enable Reminders')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`disable_${userId}`)
                .setLabel('Disable Reminders')
                .setStyle(ButtonStyle.Danger)
        );

        const menuMessage = await message.reply({ embeds: [mainEmbed], components: [row] });

        const collector = menuMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 15000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
            }

            const updateEmbed = new EmbedBuilder().setTimestamp().setColor(0xDC143C);

            if (interaction.customId === `enable_${userId}`) {
                disabledUsers.delete(userId);
                updateEmbed
                    .setTitle('Reminders Enabled')
                    .setDescription('✅ Your OwO reminders have been turned on successfully.');
            } else if (interaction.customId === `disable_${userId}`) {
                disabledUsers.set(userId, true);
                updateEmbed
                    .setTitle('Reminders Disabled')
                    .setDescription('❌ Your OwO reminders have been turned off successfully.');
            }

            await interaction.update({ embeds: [updateEmbed], components: [] });
            collector.stop('clicked');
        });

        collector.on('end', (collected, reason) => {
            setTimeout(() => {
                menuMessage.delete().catch(() => {});
                message.delete().catch(() => {});
            }, 5000);
        });
    },

    shutdown() {
        disabledUsers.clear();
    }
};
