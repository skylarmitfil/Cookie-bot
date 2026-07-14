const { ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/app/data';
const DATA_FILE = path.join(DATA_DIR, 'userSettings.json');
let userSettings = new Map();

// --- INITIALIZE DATA PERSISTENCE ON BOOT ---
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

// RAW COMPONENTS V2 PAYLOAD BUILDER (Emulates Pookie Bot box design)
function generateHelpPayload(userId, category, prefix, username) {
    const config = getOrCreateUserConfig(userId)[category];
    
    const configDescription = 
        `${config.enabled ? '✅' : '❌'} **Is this reminder enabled?**\n\n` +
        `${config.ping ? '✅' : '❌'} **Pings / mentions enabled?**\n` +
        `${config.reply ? '✅' : '❌'} **Use inline replies?**`;

    // Returning a raw API layout blueprint
    return {
        flags: 32768, // CRUCIAL: Enables Components V2 processing
        components: [
            {
                type: 1, // Action Row
                components: [
                    {
                        type: 3, // String Select Menu Component
                        custom_id: `help_nav_menu_${userId}`,
                        placeholder: '📜 Choose settings category to edit...',
                        options: [
                            { label: 'Hunt / Battle', value: 'Hunt/Battle', description: 'Configure hunt and battle reminders', emoji: { name: '⚔️' }, default: category === 'Hunt/Battle' },
                            { label: 'Pray / Curse', value: 'Pray/Curse', description: 'Configure pray and curse reminders', emoji: { name: '🙏' }, default: category === 'Pray/Curse' },
                            { label: 'OwO / UwU', value: 'OwO', description: 'Configure owo and uwu action reminders', emoji: { name: '✨' }, default: category === 'OwO' }
                        ]
                    }
                ]
            },
            {
                type: 1, // Second Action Row holding the text section inside the V2 wrapper
                components: [
                    {
                        type: 4, // Text Display / Section sub-component
                        text: `🔗 **[Support Server](https://discord.gg)** | 📖 **[Bot Wiki](https://discord-cookie.com)**\n` +
                              `*+:...oo━━━━━━━ Help Menu ━━━━━━━oo...:+*\n\n` +
                              `**Main commands:**\n` +
                              `┃ \`${prefix}r hunt\` \`${prefix}r pray\` \`${prefix}r owo\`\n\n` +
                              `**Active Category Status:** (${category === 'OwO' ? 'OwO/UwU' : category})\n` +
                              `${configDescription}\n\n` +
                              `*+:...oo━━━━━━━━━━━━━━━━━━━━━━oo...:+*`
                    }
                ]
            }
        ]
    };
}

module.exports = {
    name: 'userPreferences',
    
    getSetting(userId, category, settingKey) {
        const userConfig = getOrCreateUserConfig(userId);
        return userConfig[category][settingKey];
    },

    async execute(message, prefix) {
        const content = message.content.toLowerCase().trim();
        let targetCategory = '';

        if (content.startsWith(`${prefix}help`)) {
            targetCategory = 'Hunt/Battle'; 
        } else if (content.startsWith(`${prefix}r `)) {
            const args = content.split(' ');
            if (args.length < 2) return;
            const subCommand = args[1];

            if (['hunt', 'battle', 'h', 'b'].includes(subCommand)) targetCategory = 'Hunt/Battle';
            else if (['pray', 'curse', 'p', 'c'].includes(subCommand)) targetCategory = 'Pray/Curse';
            else if (['owo', 'uwu', 'o'].includes(subCommand)) targetCategory = 'OwO';
            else if (['help', 'menu', 'config', 'settings'].includes(subCommand)) targetCategory = 'Hunt/Battle';
        }

        if (!targetCategory) return;

        const userId = message.author.id;
        let currentCategory = targetCategory;
        
        // Build the raw layout packet
        let payload = generateHelpPayload(userId, currentCategory, prefix, message.author.username);
        
        // We use standard message.reply but pass our raw API structure
        const menuMessage = await message.reply(payload);
        const collector = menuMessage.createMessageComponentCollector({ idle: 45000 });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
            }

            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('help_nav_menu_')) {
                currentCategory = interaction.values[0]; 
            }

            const updatedPayload = generateHelpPayload(userId, currentCategory, prefix, interaction.user.username);
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
