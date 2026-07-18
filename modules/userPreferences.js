const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/app/data';
const DATA_FILE = path.join(DATA_DIR, 'userSettings.json');
let userSettings = new Map();

// Map short IDs to standard database keys to avoid slash parsing breaks in custom IDs
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
            userSettings = new Map(Object.entries(parsed));
            console.log(`[STORAGE] Successfully loaded ${userSettings.size} user profiles from persistent volume.`);
        }
    } else {
        console.log('[STORAGE] No existing settings file found. Ready to track configuration states.');
    }
} catch (error) {
    console.error(`[STORAGE ERROR] Failed during early boot read initialization: ${error.message}`);
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
    const shortCat = REVERSE_MAP[category];
    
    const embed = new EmbedBuilder()
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
        .setCustomId(`r_toggle_${shortCat}_enabled_${userId}`)
        .setLabel(category.toLowerCase())
        .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger);

    if (category === 'Pray/Curse') {
        mainButton.setEmoji('1520116373408317570');
    } else if (category === 'Hunt/Battle') {
        mainButton.setEmoji('1520116392756772944');
    } else if (category === 'OwO') {
        mainButton.setEmoji('1527608869377933463');
    }

    const row = new ActionRowBuilder().addComponents(
        mainButton,
        new ButtonBuilder()
            .setCustomId(`r_toggle_${shortCat}_ping_${userId}`)
            .setLabel(config.ping ? 'ping' : 'silent')
            .setStyle(config.ping ? ButtonStyle.Success : ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`r_toggle_${shortCat}_reply_${userId}`)
            .setLabel(config.reply ? 'reply' : 'send')
            .setStyle(config.reply ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    return { embeds: [embed], components: [row] };
}

module.exports = {
    name: 'userPreferences',
    
    getSetting(userId, category, settingKey) {
        const userConfig = getOrCreateUserConfig(userId);
        return userConfig[category][settingKey];
    },

    async execute(message, prefix) {
        const content = message.content.toLowerCase().trim();
        
        // Split text by spaces using a Regex to strip any accidental double spaces
        const args = content.split(/\s+/);
        if (args.length < 1) return;

        let subCommand = '';

        // Safe Fallback Parsing: Matches whether your main framework passes ".c hunt" OR just "c hunt"
        if (args[0] === '.c' || (args[0] === 'c' && args.length > 1)) {
            subCommand = args[0] === '.c' ? args[1] : args[2];
        } else {
            // If the framework passes only the subcommand argument directly
            subCommand = args[0];
        }

        if (!subCommand) return;

        let targetCategory = '';

        // Route the paired commands directly to their correct categories
        if (['hunt', 'battle'].includes(subCommand)) {
            targetCategory = 'Hunt/Battle';
        } else if (['pray', 'curse'].includes(subCommand)) {
            targetCategory = 'Pray/Curse';
        } else if (['owo', 'uwu'].includes(subCommand)) {
            targetCategory = 'OwO';
        }

        // If the message wasn't intended for this command module, exit silently
        if (!targetCategory) return;

        const userId = message.author.id;
        const avatarURL = message.author.displayAvatarURL({ forceStatic: false, size: 256 });
        
        const payload = buildConfigPayload(userId, targetCategory, avatarURL);
        payload.embeds[0].setTitle(`${message.author.username}'s ${targetCategory.toLowerCase()} reminder settings`);
        
        const menuMessage = await message.reply(payload);

        const collector = menuMessage.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            idle: 25000 
        });

        collector.on('collect', async (interaction) => {
            const parts = interaction.customId.split('_');
            const shortCat = parts[2];
            const settingKey = parts[3];
            const targetUserId = parts[4];

            if (interaction.user.id !== targetUserId) {
                return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
            }

            const dbCategory = CATEGORY_MAP[shortCat];
            const config = getOrCreateUserConfig(targetUserId);
            
            config[dbCategory][settingKey] = !config[dbCategory][settingKey];
            saveSettingsData();

            const updatedPayload = buildConfigPayload(targetUserId, dbCategory, avatarURL);
            updatedPayload.embeds[0].setTitle(`${interaction.user.username}'s ${dbCategory.toLowerCase()} reminder settings`);
            
            await interaction.update(updatedPayload);
        });

        collector.on('end', () => {
            menuMessage.delete().catch(() => {});
            message.delete().catch(() => {});
        });
    },

    shutdown() {
        saveSettingsData();
        userSettings.clear();
    }
};
