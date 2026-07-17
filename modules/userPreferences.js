const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'userSettings.json');
let userSettings = new Map();

// --- STORAGE INITIALIZATION ---
try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        if (rawData.trim()) {
            userSettings = new Map(Object.entries(JSON.parse(rawData)));
        }
    }
} catch (error) {
    console.error(`[STORAGE ERROR]: ${error.message}`);
}

function saveSettingsData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(Object.fromEntries(userSettings), null, 2), 'utf8');
    } catch (error) {
        console.error(`[STORAGE ERROR]: Failed to save data: ${error.message}`);
    }
}

function getOrCreateUserConfig(userId) {
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
    const config = getOrCreateUserConfig(userId)[category];
    
    // Custom emojis mapping for the buttons
    const EMOJIS = {
        'Hunt/Battle': '<:hunt_battle:1520116392756772944>',
        'Pray/Curse': '<:Praycurse:1520116373408317570>',
        'OwO': '<:owo:1527608869377933463>'
    };

    const embed = new EmbedBuilder()
        .setTitle(`${category} Settings`)
        .setDescription(
            `**Enabled:** ${config.enabled ? 'Yes ✅' : 'No ❌'}\n` +
            `**Ping:** ${config.ping ? 'ON 🔔' : 'OFF 🔕'}\n` +
            `**Reply:** ${config.reply ? 'ON 💬' : 'OFF ✉️'}`
        )
        .setThumbnail(avatarURL)
        .setColor(config.enabled ? 0x57F287 : 0xED4245);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`r_toggle_${category}_enabled_${userId}`)
            .setLabel(config.enabled ? `Enabled ${EMOJIS[category]}` : `Disabled ${EMOJIS[category]}`)
            .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`r_toggle_${category}_ping_${userId}`)
            .setLabel(config.ping ? 'Ping ON 🔔' : 'Ping OFF 🔕')
            .setStyle(config.ping ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`r_toggle_${category}_reply_${userId}`)
            .setLabel(config.reply ? 'Reply ON 💬' : 'Reply OFF ✉️')
            .setStyle(config.reply ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [row] };
}

module.exports = {
    name: 'c',
    
    getSetting(userId, category, settingKey) {
        const userConfig = getOrCreateUserConfig(userId);
        return userConfig[category][settingKey];
    },

    async execute(message, args) {
        const subCommand = args[0]?.toLowerCase();
        let targetCategory = '';
        
        if (['hunt', 'battle', 'h', 'b'].includes(subCommand)) targetCategory = 'Hunt/Battle';
        else if (['pray', 'curse', 'p', 'c'].includes(subCommand)) targetCategory = 'Pray/Curse';
        else if (['owo', 'uwu', 'o'].includes(subCommand)) targetCategory = 'OwO';

        if (!targetCategory) return message.reply('Usage: `.c <hunt|pray|owo>`');

        const userId = message.author.id;
        const avatarURL = message.author.displayAvatarURL();
        const payload = buildConfigPayload(userId, targetCategory, avatarURL);
        
        const menuMessage = await message.reply(payload);

        const collector = menuMessage.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 30000 });
        
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your menu!', ephemeral: true });
            
            const parts = interaction.customId.split('_');
            const config = getOrCreateUserConfig(userId);
            
            // Toggle the setting
            config[parts[2]][parts[3]] = !config[parts[2]][parts[3]];
            saveSettingsData();
            
            await interaction.update(buildConfigPayload(userId, parts[2], avatarURL));
        });
    }
};
