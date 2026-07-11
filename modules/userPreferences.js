const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/app/data';
const DATA_FILE = path.join(DATA_DIR, 'userSettings.json');
let userSettings = new Map();

function loadSettingsData() {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, 'utf8');
            if (rawData.trim()) userSettings = new Map(Object.entries(JSON.parse(rawData)));
        }
    } catch (e) { console.error(`[STORAGE ERROR] ${e.message}`); }
}

function saveSettingsData() {
    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(Object.fromEntries(userSettings), null, 2), 'utf8');
    } catch (e) { console.error(`[STORAGE ERROR] ${e.message}`); }
}

function getUserConfig(userId) {
    if (userSettings.size === 0) loadSettingsData();
    if (!userSettings.has(userId)) {
        userSettings.set(userId, {
            'Hunt/Battle': { enabled: true, ping: true, reply: true },
            'Pray/Curse': { enabled: true, ping: true, reply: true },
            'OwO': { enabled: true, ping: true, reply: true }
        });
        saveSettingsData();
    }
    return userSettings.get(userId);
}

function buildConfigPayload(userId, category, avatarURL) {
    const config = getUserConfig(userId)[category];
    
    const embed = new EmbedBuilder()
        .setTitle(`${userId.username || 'User'}'s ${category.toLowerCase()} reminder settings`)
        .setThumbnail(avatarURL)
        .setColor(config.enabled ? 0x57F287 : 0xED4245)
        .setDescription(
            `${config.enabled ? '✅' : '❌'} **Is this reminder enabled?**\n\n` +
            `${config.ping ? '✅' : '❌'} **Pings / mentions enabled?**\n` +
            `${config.reply ? '✅' : '❌'} **Use inline replies?**`
        )
        .setFooter({ text: `Customize ${category.toLowerCase()} reminders seamlessly` })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`r_toggle_${category}_enabled_${userId}`)
            .setLabel(category.toLowerCase())
            .setEmoji(config.enabled ? '😇' : '💀')
            .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`r_toggle_${category}_ping_${userId}`)
            .setLabel(config.ping ? 'ping' : 'silent')
            .setStyle(config.ping ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`r_toggle_${category}_reply_${userId}`)
            .setLabel(config.reply ? 'reply' : 'send')
            .setStyle(config.reply ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

module.exports = {
    name: 'userPreferences',
    
    getSetting(userId, category, settingKey) {
        if (userSettings.size === 0) loadSettingsData();
        const userConfig = getUserConfig(userId);
        return userConfig[category][settingKey];
    },

    async execute(message, prefix) {
        const content = message.content.toLowerCase().trim();
        if (!content.startsWith('.r ')) return;

        const args = content.split(' ');
        const subCommand = args[1];

        let targetCategory = '';
        if (['hunt', 'battle', 'h', 'b'].includes(subCommand)) targetCategory = 'Hunt/Battle';
        else if (['pray', 'curse', 'p', 'c'].includes(subCommand)) targetCategory = 'Pray/Curse';
        else if (['owo', 'uwu'].includes(subCommand)) targetCategory = 'OwO';

        if (!targetCategory) return;

        const userId = message.author.id;
        const avatarURL = message.author.displayAvatarURL({ dynamic: true, size: 256 });
        
        const payload = buildConfigPayload(userId, targetCategory, avatarURL);
        payload.embeds[0].setTitle(`${message.author.username}'s ${targetCategory.toLowerCase()} reminder settings`);

        const menuMessage = await message.reply(payload);

        const collector = menuMessage.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
            }

            const parts = interaction.customId.split('_');
            const category = parts[2];
            const settingKey = parts[3];

            const userConfig = getUserConfig(userId);
            userConfig[category][settingKey] = !userConfig[category][settingKey];
            
            saveSettingsData();

            const updatedPayload = buildConfigPayload(userId, category, avatarURL);
            updatedPayload.embeds[0].setTitle(`${message.author.username}'s ${category.toLowerCase()} reminder settings`);
            
            await interaction.update(updatedPayload);
        });
    }
};
