const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
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
            console.log(`[STORAGE] Loaded ${userSettings.size} profiles smoothly.`);
        }
    }
} catch (error) {
    console.error(`[STORAGE ERROR] Initialization crash: ${error.message}`);
}

function saveSettingsData() {
    try {
        const obj = Object.fromEntries(userSettings);
        fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (error) {
        console.error(`[STORAGE ERROR] Save failed: ${error.message}`);
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

function generateHelpPayload(userId, category, avatarURL, prefix, username) {
    const config = getOrCreateUserConfig(userId)[category];
    
    const embed = new EmbedBuilder()
        .setThumbnail(avatarURL)
        .setColor(config.enabled ? 0x57F287 : 0xED4245)
        .setFooter({ text: 'Customize your reminders seamlessly' })
        .setTimestamp();

    const configDescription = 
        `${config.enabled ? '✅' : '❌'} **Is this reminder enabled?**\n\n` +
        `${config.ping ? '✅' : '❌'} **Pings / mentions enabled?**\n` +
        `${config.reply ? '✅' : '❌'} **Use inline replies?**`;

    embed.setTitle(`${username}'s Help & Configuration`);
    embed.setDescription(
        `🔗 **[Support Server](https://discord.gg)** | 📖 **[Bot Wiki](https://discord-cookie.com)**\n` +
        `*+:...oo━━━━━━━ Help Menu ━━━━━━━oo...:+*\n\n` +
        `**Main commands:**\n` +
        `┃ \`${prefix}r hunt\` \`${prefix}r pray\` \`${prefix}r owo\`\n\n` +
        `**Active Category Status:** (${category === 'OwO' ? 'OwO/UwU' : category})\n` +
        `${configDescription}\n\n` +
        `*+:...oo━━━━━━━━━━━━━━━━━━━━━━oo...:+*`
    );

    const dropdownMenu = new StringSelectMenuBuilder()
        .setCustomId(`help_nav_menu_${userId}`)
        .setPlaceholder('📜 Choose settings category to edit...')
        .addOptions([
            { label: 'Hunt / Battle', value: 'Hunt/Battle', description: 'Configure hunt and battle reminders', emoji: '⚔️', default: category === 'Hunt/Battle' },
            { label: 'Pray / Curse', value: 'Pray/Curse', description: 'Configure pray and curse reminders', emoji: '🙏', default: category === 'Pray/Curse' },
            { label: 'OwO / UwU', value: 'OwO', description: 'Configure owo and uwu action reminders', emoji: '✨', default: category === 'OwO' }
        ]);
    const dropdownRow = new ActionRowBuilder().addComponents(dropdownMenu);

    const mainButton = new ButtonBuilder()
        .setCustomId(`r_toggle_${category}_enabled_${userId}`)
        .setLabel(category.toLowerCase())
        .setStyle(config.enabled ? ButtonStyle.Success : ButtonStyle.Danger);

    if (category === 'Pray/Curse') mainButton.setEmoji('1525576307822301304');
    else if (category === 'Hunt/Battle') mainButton.setEmoji('1520116392756772944');
    else if (category === 'OwO') mainButton.setEmoji('1525577851888205915');

    const toggleButtonsRow = new ActionRowBuilder().addComponents(
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

    return { embeds: [embed], components: [dropdownRow, toggleButtonsRow] };
}

module.exports = {
    // FIX 1: Set name strictly to 'help' so your central module loader matches ".help" routing loops correctly
    name: 'help', 

    async execute(message, prefix) {
        const content = message.content.toLowerCase().trim();
        let targetCategory = '';

        // Route either .help or subcategory aliases smoothly
        if (content === `${prefix}help`) {
            targetCategory = 'Hunt/Battle'; 
        } else if (content.startsWith(`${prefix}r `)) {
            const args = content.split(' ');
            if (args.length < 2) return; 
            
            const subCommand = args[1]; // Safely target the specific subcommand string position
            if (['hunt', 'battle', 'h', 'b'].includes(subCommand)) targetCategory = 'Hunt/Battle';
            else if (['pray', 'curse', 'p', 'c'].includes(subCommand)) targetCategory = 'Pray/Curse';
            else if (['owo', 'uwu', 'o'].includes(subCommand)) targetCategory = 'OwO';
            else if (['help', 'menu', 'config', 'settings'].includes(subCommand)) targetCategory = 'Hunt/Battle';
        }

        if (!targetCategory) return;

        const userId = message.author.id;
        const avatarURL = message.author.displayAvatarURL({ forceStatic: false, size: 256 });
        
        let currentCategory = targetCategory;
        let payload = generateHelpPayload(userId, currentCategory, avatarURL, prefix, message.author.username);
        
        const menuMessage = await message.reply(payload);
        const collector = menuMessage.createMessageComponentCollector({ idle: 45000 });

        collector.on('collect', async (interaction) => {
            if (interaction.user.id !== userId) {
                return interaction.reply({ content: '❌ This menu is not for you!', ephemeral: true });
            }

            // FIX 2: Explicitly grab index position [0] from values array context to prevent evaluation routing crashes
            if (interaction.isStringSelectMenu() && interaction.customId.startsWith('help_nav_menu_')) {
                currentCategory = interaction.values[0]; 
            }

            if (interaction.isButton() && interaction.customId.startsWith('r_toggle_')) {
                const buttonParts = interaction.customId.split('_');
                const targetCat = buttonParts[2];     
                const settingKey = buttonParts[3];    

                const userConfig = getOrCreateUserConfig(userId);
                userConfig[targetCat][settingKey] = !userConfig[targetCat][settingKey];
                saveSettingsData();
            }

            const updatedPayload = generateHelpPayload(userId, currentCategory, avatarURL, prefix, interaction.user.username);
            await interaction.update(updatedPayload);
        });

        collector.on('end', () => {
            menuMessage.delete().catch(() => {});
            message.delete().catch(() => {});
        });
    }
};
