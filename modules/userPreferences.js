const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

const userSettings = new Map();

const ALL_COOLDOWNS = ['Hunt/Battle', 'Pray/Curse', 'OwO'];

function getOrCreateUserConfig(userId) {
    if (!userSettings.has(userId)) {
        userSettings.set(userId, {
            'Hunt/Battle': true,
            'Pray/Curse': true,
            'OwO': true
        });
    }
    return userSettings.get(userId);
}

function buildSettingsPayload(userId, avatarURL) {
    const config = getOrCreateUserConfig(userId);
    
    const enabledList = ALL_COOLDOWNS.filter(key => config[key]);
    const disabledList = ALL_COOLDOWNS.filter(key => !config[key]);

    const embed = new EmbedBuilder()
        .setTitle('Reminder Settings')
        .setDescription('Toggle which reminders are enabled below.')
        .setThumbnail(avatarURL)
        .setColor(0xDC143C)
        .addFields(
            { name: 'Enabled Reminders', value: enabledList.length ? enabledList.join(', ') : 'None', inline: false },
            { name: 'Disabled Reminders', value: disabledList.length ? disabledList.join(', ') : 'None', inline: false }
        )
        .setFooter({ text: 'Use the buttons below to toggle reminders' })
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`toggle_Hunt/Battle_${userId}`)
            .setLabel('Hunt/Battle')
            .setStyle(config['Hunt/Battle'] ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`toggle_Pray/Curse_${userId}`)
            .setLabel('Pray/Curse')
            .setStyle(config['Pray/Curse'] ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`toggle_OwO_${userId}`)
            .setLabel('OwO')
            .setStyle(config['OwO'] ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`action_enableAll_${userId}`)
            .setLabel('Enable All')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`action_disableAll_${userId}`)
            .setLabel('Disable All')
            .setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [row1, row2] };
}

module.exports = {
    name: 'userPreferences',
    
    isReminderDisabled(userId, reminderKey) {
        if (!userSettings.has(userId)) return false;
        return !userSettings.get(userId)[reminderKey];
    },

    async execute(message, prefix) {
        const content = message.content.toLowerCase().trim();
        if (content !== `${prefix}reminders`) return;

        const userId = message.author.id;
        const avatarURL = message.author.displayAvatarURL({ dynamic: true, size: 256 });
        const payload = buildSettingsPayload(userId, avatarURL);

        const menuMessage = await message.reply(payload);

        const collector = menuMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
            }

            const config = getOrCreateUserConfig(userId);
            const customId = interaction.customId;

            if (customId.startsWith('toggle_')) {
                const parts = customId.split('_');
                const targetKey = parts[1];
                config[targetKey] = !config[targetKey];
            } else if (customId.startsWith('action_enableAll_')) {
                ALL_COOLDOWNS.forEach(key => config[key] = true);
            } else if (customId.startsWith('action_disableAll_')) {
                ALL_COOLDOWNS.forEach(key => config[key] = false);
            }

            const updatedPayload = buildSettingsPayload(userId, avatarURL);
            await interaction.update(updatedPayload);
        });
    },

    shutdown() {
        userSettings.clear();
    }
};
