const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Use a local folder for data to avoid permission issues
const DATA_DIR = path.join(__dirname, '../data');
const DATA_FILE = path.join(DATA_DIR, 'userSettings.json');
let userSettings = new Map();

// Load storage
try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(DATA_FILE)) {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        if (rawData.trim()) userSettings = new Map(Object.entries(JSON.parse(rawData)));
    }
} catch (error) { console.error(`[STORAGE ERROR]: ${error.message}`); }

function saveSettingsData() {
    const obj = Object.fromEntries(userSettings);
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
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
    const embed = new EmbedBuilder()
        .setTitle(`Settings for ${category}`)
        .setDescription(`${config.enabled ? '✅' : '❌'} **Enabled**\n${config.ping ? '✅' : '❌'} **Ping**\n${config.reply ? '✅' : '❌'} **Reply**`)
        .setThumbnail(avatarURL)
        .setColor(config.enabled ? 0x57F287 : 0xED4245);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`r_toggle_${category}_enabled_${userId}`).setLabel(category).setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`r_toggle_${category}_ping_${userId}`).setLabel(config.ping ? 'ping' : 'silent').setStyle(config.ping ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`r_toggle_${category}_reply_${userId}`).setLabel(config.reply ? 'reply' : 'send').setStyle(config.reply ? ButtonStyle.Success : ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [row] };
}

module.exports = {
    name: 'c', // The bot now responds to !c
    async execute(message, args) {
        const subCommand = args[0]?.toLowerCase();
        let targetCategory = '';
        if (['hunt', 'battle', 'h', 'b'].includes(subCommand)) targetCategory = 'Hunt/Battle';
        else if (['pray', 'curse', 'p', 'c'].includes(subCommand)) targetCategory = 'Pray/Curse';
        else if (['owo', 'uwu', 'o'].includes(subCommand)) targetCategory = 'OwO';

        if (!targetCategory) return message.reply('Usage: `!c <hunt|pray|owo>`');

        const userId = message.author.id;
        const payload = buildConfigPayload(userId, targetCategory, message.author.displayAvatarURL());
        const menuMessage = await message.reply(payload);

        const collector = menuMessage.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 30000 });
        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== userId) return interaction.reply({ content: 'Not your menu!', ephemeral: true });
            const parts = interaction.customId.split('_');
            const config = getOrCreateUserConfig(userId);
            config[parts[2]][parts[3]] = !config[parts[2]][parts[3]];
            saveSettingsData();
            await interaction.update(buildConfigPayload(userId, parts[2], message.author.displayAvatarURL()));
        });
    }
};
