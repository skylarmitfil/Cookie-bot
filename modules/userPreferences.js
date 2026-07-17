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

// Internal mapping safe for custom IDs (no slashes allowed)
const CATEGORY_MAP = {
    'hunt': 'Hunt/Battle',
    'pray': 'Pray/Curse',
    'owo': 'OwO'
};

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

function buildConfigPayload(userId, shortCategory, avatarURL) {
    const fullCategory = CATEGORY_MAP[shortCategory];
    const config = getOrCreateUserConfig(userId)[fullCategory];
    
    const EMOJIS = {
        'hunt': '<:hunt_battle:1520116392756772944>',
        'pray': '<:Praycurse:1520116373408317570>',
        'owo': '<:owo:1527608869377933463>'
    };

    const embed = new EmbedBuilder()
        .setTitle(`${fullCategory} Settings`)
        .setDescription(
            `**Enabled:** ${config.enabled ? 'Yes ✅' : 'No ❌'}\n` +
            `**Ping:** ${config.ping ? 'ON 🔔' : 'OFF 🔕'}\n` +
            `**Reply:** ${config.reply ? 'ON 💬' : 'OFF ✉️'}`
        )
        .setThumbnail(avatarURL)
        .setColor(config.enabled ? 0x57F287 : 0xED4245);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`r_toggle_${shortCategory}_enabled_${userId}`)
            .setLabel(config.enabled ? `Enabled ${EMOJIS[shortCategory]}` : `Disabled ${EMOJIS[shortCategory]}`)
            .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`r_toggle_${shortCategory}_ping_${userId}`)
            .setLabel(config.ping ? 'Ping ON 🔔' : 'Ping OFF 🔕')
            .setStyle(config.ping ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`r_toggle_${shortCategory}_reply_${userId}`)
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
        let shortCategory = '';
        
        if (['hunt', 'battle', 'h', 'b'].includes(subCommand)) shortCategory = 'hunt';
        else if (['pray', 'curse', 'p', 'c'].includes(subCommand)) shortCategory = 'pray';
        else if (['owo', 'uwu', 'o'].includes(subCommand)) shortCategory = 'owo';

        if (!shortCategory) return message.reply('Usage: `.c <hunt|pray|owo>`');

        const userId = message.author.id;
        const avatarURL = message.author.displayAvatarURL();
        const payload = buildConfigPayload(userId, shortCategory, avatarURL);
        
        const menuMessage = await message.reply(payload);

        const collector = menuMessage.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            idle: 30000 
        });
        
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ Not your menu!', ephemeral: true });
            }
            
            const parts = interaction.customId.split('_');
            const clickedShortCategory = parts[2]; // 'hunt', 'pray', or 'owo'
            const settingKey = parts[3];           // 'enabled', 'ping', or 'reply'
            
            const fullCategory = CATEGORY_MAP[clickedShortCategory];
            const config = getOrCreateUserConfig(userId);
            
            // Toggle the setting safely
            config[fullCategory][settingKey] = !config[fullCategory][settingKey];
            saveSettingsData();
            
            await interaction.update(buildConfigPayload(userId, clickedShortCategory, avatarURL));
        });

        // Clean up components on idle timeout to completely avoid memory leaks
        collector.on('end', async () => {
            try {
                const disabledRow = ActionRowBuilder.from(payload.components[0]);
                disabledRow.components.forEach(btn => btn.setDisabled(true));
                await menuMessage.edit({ components: [disabledRow] });
            } catch (err) {
                // Fails silently if message was deleted by user
            }
        });
    }
};
