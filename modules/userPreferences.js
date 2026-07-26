const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/app/data';
const DATA_FILE = path.join(DATA_DIR, 'userSettings.json');
let userSettings = new Map();

const CATEGORY_MAP = {
    'hunt': 'Hunt/Battle',
    'pray': 'Pray/Curse',
    'owo': 'OwO'
};
const REVERSE_MAP = {
    'Hunt/Battle': 'hunt',
    'Pray/Curse': 'pray',
    'OwO': 'owo'
};

try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        if (rawData.trim()) {
            const parsed = JSON.parse(rawData);
            for (const [uid, settings] of Object.entries(parsed)) {
                if (settings.autoDelete === undefined) {
                    settings.autoDelete = false;
                }
            }
            userSettings = new Map(Object.entries(parsed));
            console.log(`[STORAGE] Successfully loaded ${userSettings.size} user profiles.`);
        }
    }
} catch (error) {
    console.error(`[STORAGE ERROR] Init error: ${error.message}`);
}

function saveSettingsData() {
    try {
        const obj = Object.fromEntries(userSettings);
        fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (error) {
        console.error(`[STORAGE ERROR] Save error: ${error.message}`);
    }
}

function getOrCreateUserConfig(userId) {
    if (!userSettings.has(userId)) {
        userSettings.set(userId, {
            'Hunt/Battle': { enabled: true, ping: true, reply: true },
            'Pray/Curse': { enabled: true, ping: true, reply: true },
            'OwO': { enabled: true, ping: true, reply: true },
            autoDelete: false
        });
        saveSettingsData();
    } else {
        const userConfig = userSettings.get(userId);
        if (userConfig.autoDelete === undefined) {
            userConfig.autoDelete = false;
        }
    }
    return userSettings.get(userId);
}

function buildConfigPayload(userId, category, avatarURL) {
    const fullConfig = getOrCreateUserConfig(userId);
    const config = fullConfig[category];
    const shortCat = REVERSE_MAP[category];
    const isAutoDelete = fullConfig.autoDelete;
    
    const embed = new EmbedBuilder()
        .setDescription(
            `${config.enabled ? '✅' : '❌'} **Is this reminder enabled?**\n\n` +
            `${config.ping ? '✅' : '❌'} **Pings / mentions enabled?**\n` +
            `${config.reply ? '✅' : '❌'} **Use inline replies?**\n\n` +
            `${isAutoDelete ? '✅' : '❌'} **Auto-delete reminders:** \`${isAutoDelete ? 'True' : 'False'}\``
        )
        .setThumbnail(avatarURL)
        .setColor(config.enabled ? 0x57F287 : 0xED4245)
        .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`r_toggle_${shortCat}_enabled_${userId}`)
            .setLabel(category.toLowerCase())
            .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`r_toggle_${shortCat}_ping_${userId}`)
            .setLabel(config.ping ? 'ping' : 'silent')
            .setStyle(config.ping ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`r_toggle_${shortCat}_reply_${userId}`)
            .setLabel(config.reply ? 'reply' : 'send')
            .setStyle(config.reply ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`r_toggle_autodelete_${userId}`)
            .setLabel(`Auto-Delete: ${isAutoDelete ? 'On' : 'Off'}`)
            .setStyle(isAutoDelete ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row1, row2] };
}

module.exports = {
    name: 'c',
    
    getSetting(userId, category, settingKey) {
        const userConfig = getOrCreateUserConfig(userId);
        if (settingKey === 'autoDelete') return userConfig.autoDelete;
        return userConfig[category][settingKey];
    },

    async execute(message, args) {
        if (!args || args.length < 1) return;
        
        const subCommand = args[0].toLowerCase();
        let targetCategory = '';

        if (['hunt', 'battle'].includes(subCommand)) targetCategory = 'Hunt/Battle';
        else if (['pray', 'curse'].includes(subCommand)) targetCategory = 'Pray/Curse';
        else if (['owo', 'uwu'].includes(subCommand)) targetCategory = 'OwO';

        if (!targetCategory) return;

        const userId = message.author.id;
        const avatarURL = message.author.displayAvatarURL({ forceStatic: false, size: 256 });
        
        const payload = buildConfigPayload(userId, targetCategory, avatarURL);
        payload.embeds[0].setTitle(`${message.author.username}'s ${targetCategory.toLowerCase()} settings`);
        
        const menuMessage = await message.reply(payload);

        const collector = menuMessage.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            idle: 25000 
        });

        collector.on('collect', async (interaction) => {
            const parts = interaction.customId.split('_');
            const targetUserId = parts[parts.length - 1];

            if (interaction.user.id !== targetUserId) {
                return interaction.reply({ content: '❌ Not your menu!', ephemeral: true });
            }

            const userConfig = getOrCreateUserConfig(targetUserId);
            
            if (parts[2] === 'autodelete') {
                userConfig.autoDelete = !userConfig.autoDelete;
            } else {
                const shortCat = parts[2];
                const settingKey = parts[3];
                const dbCategory = CATEGORY_MAP[shortCat];
                userConfig[dbCategory][settingKey] = !userConfig[dbCategory][settingKey];
            }
            
            saveSettingsData();

            const currentAvatarURL = interaction.user.displayAvatarURL({ forceStatic: false, size: 256 });
            const updatedPayload = buildConfigPayload(targetUserId, targetCategory, currentAvatarURL);
            updatedPayload.embeds[0].setTitle(`${interaction.user.username}'s ${targetCategory.toLowerCase()} settings`);
            
            await interaction.update(updatedPayload);
        });

        collector.on('end', () => {
            menuMessage.delete().catch(() => {});
            message.delete().catch(() => {});
        });
    }
};
