const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/app/data';
const DATA_FILE = path.join(DATA_DIR, 'userSettings.json');
let userSettings = new Map();

function loadSettingsData() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, 'utf8');
            if (rawData.trim()) {
                const parsed = JSON.parse(rawData);
                userSettings = new Map(Object.entries(parsed));
            }
        }
    } catch (error) {
        console.error(`[STORAGE ERROR] Failed to load data file: ${error.message}`);
    }
}

function saveSettingsData() {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const obj = Object.fromEntries(userSettings);
        fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (error) {
        console.error(`[STORAGE ERROR] Failed to save data file: ${error.message}`);
    }
}

function getOrCreateUserConfig(userId) {
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

function buildConfigPayload(userId, category, avatarURL, username) {
    const config = getOrCreateUserConfig(userId)[category];
    
    const embed = new EmbedBuilder()
        .setTitle(`${username}'s ${category.toLowerCase()} reminder settings`)
        .setDescription(
            `${config.enabled ? '✅' : '❌'} **Is this reminder enabled?**\n\n` +
            `${config.ping ? '✅' : '❌'} **Pings / mentions enabled?**\n` +
            `${config.reply ? '✅' : '❌'} **Use inline replies?**`
        )
        .setThumbnail(avatarURL)
        .setColor(config.enabled ? 0x57F287 : 0xED4245)
        .setFooter({ text: 'Customize your reminders seamlessly' })
        .setTimestamp();

    const mainButton = new ButtonBuilder()
        .setCustomId(`r_toggle_${category}_enabled_${userId}`)
        .setLabel(category.toLowerCase())
        .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger);

    if (category === 'Pray/Curse') mainButton.setEmoji('🙏');
    else if (category === 'Hunt/Battle') mainButton.setEmoji('⚔️');
    else if (category === 'OwO') mainButton.setEmoji('🦊');

    const row = new ActionRowBuilder().addComponents(
        mainButton,
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
        const userConfig = getOrCreateUserConfig(userId);
        return userConfig[category][settingKey];
    },

    // Fixed parts string mapping indices
    handleButton(interaction) {
        const parts = interaction.customId.split('_');
        const category = parts[2];
        const settingKey = parts[3];
        const userId = parts[4];

        if (interaction.user.id !== userId) {
            return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
        }

        const config = getOrCreateUserConfig(userId);
        config[category][settingKey] = !config[category][settingKey];
        saveSettingsData();

        const avatarURL = interaction.user.displayAvatarURL({ dynamic: true, size: 256 });
        const updatedPayload = buildConfigPayload(userId, category, avatarURL, interaction.user.username);
        
        return interaction.update(updatedPayload);
    },

    async execute(message, prefix) {
        const content = message.content.toLowerCase().trim();
        if (!content.startsWith(`${prefix}r `)) return;

        const args = content.split(' ');
        const subCommand = args[1]; // Fixed explicit index location query
        let targetCategory = '';

        if (['hunt', 'battle', 'h', 'b'].includes(subCommand)) targetCategory = 'Hunt/Battle';
        else if (['pray', 'curse', 'p', 'c'].includes(subCommand)) targetCategory = 'Pray/Curse';
        else if (['owo', 'uwu', 'o'].includes(subCommand)) targetCategory = 'OwO'; // Handles owo subcommands safely

        if (!targetCategory) return;

        const userId = message.author.id;
        const avatarURL = message.author.displayAvatarURL({ dynamic: true, size: 256 });
        
        const payload = buildConfigPayload(userId, targetCategory, avatarURL, message.author.username);
        await message.reply(payload);
    },

    shutdown() {
        saveSettingsData();
        userSettings.clear();
    }
};
