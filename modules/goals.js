const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = '/app/data';
const GOALS_FILE = path.join(DATA_DIR, 'userGoals.json');
let userGoals = new Map();

try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(GOALS_FILE)) {
        const rawData = fs.readFileSync(GOALS_FILE, 'utf8');
        if (rawData.trim()) {
            const parsed = JSON.parse(rawData);
            userGoals = new Map(Object.entries(parsed));
            console.log(`[STORAGE] Successfully loaded ${userGoals.size} user goal profiles.`);
        }
    }
} catch (error) {
    console.error(`[STORAGE ERROR] Goals init error: ${error.message}`);
}

function saveGoalsData() {
    try {
        const obj = Object.fromEntries(userGoals);
        fs.writeFileSync(GOALS_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (error) {
        console.error(`[STORAGE ERROR] Goals save error: ${error.message}`);
    }
}

function getOrCreateUserGoal(userId, category) {
    if (!userGoals.has(userId)) {
        userGoals.set(userId, {});
    }
    const userMap = userGoals.get(userId);
    if (!userMap[category]) {
        userMap[category] = {
            target: 1000,
            current: 0
        };
        saveGoalsData();
    }
    return userMap[category];
}

function buildGoalsPayload(userId, category, username, avatarURL) {
    const data = getOrCreateUserGoal(userId, category);
    const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
    
    const progressPercent = data.target > 0 ? Math.min(Math.floor((data.current / data.target) * 100), 100) : 0;
    const progressBar = createProgressBar(progressPercent);

    const embed = new EmbedBuilder()
        .setTitle(`${username}'s Goal Tracker`)
        .setColor(progressPercent >= 100 ? 0x57F287 : 0x5865F2)
        .setDescription(
            `📁 **Selected Category:** \`${capitalizedCategory}\`\n\n` +
            `🎯 **Target:** \`${Number(data.target).toLocaleString()}\`\n` +
            `💎 **Current:** \`${Number(data.current).toLocaleString()}\`\n\n` +
            `**Progress:** [${progressPercent}%]\n${progressBar}`
        )
        .setThumbnail(avatarURL)
        .setTimestamp();

    const selectMenuRow = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId(`goals_select_${userId}`)
            .setPlaceholder('Select a goal category...')
            .addOptions([
                { label: 'Hunt', value: 'hunt', emoji: '🏹', default: category === 'hunt' },
                { label: 'Battle', value: 'battle', emoji: '⚔️', default: category === 'battle' },
                { label: 'Pray', value: 'pray', emoji: '🙏', default: category === 'pray' },
                { label: 'Curse', value: 'curse', emoji: '🤬', default: category === 'curse' },
                { label: 'OwO', value: 'owo', emoji: '✨', default: category === 'owo' }
            ])
    );

    const buttonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`goals_add_${category}_${userId}`)
            .setLabel('+ Add Progress')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`goals_set_${category}_${userId}`)
            .setLabel('Set Target')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(`goals_reset_${category}_${userId}`)
            .setLabel('Reset')
            .setStyle(ButtonStyle.Danger)
    );

    return { embeds: [embed], components: [selectMenuRow, buttonRow] };
}

function createProgressBar(percent) {
    const totalBars = 10;
    const filledBars = Math.round((percent / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
}

module.exports = {
    name: 'goals',

    async execute(message, args) {
        try {
            const userId = message.author.id;
            const username = message.author.username;
            const avatarURL = message.author.displayAvatarURL({ forceStatic: false, size: 256 });

            const initialCategory = args && args[0] && ['hunt', 'battle', 'pray', 'curse', 'owo'].includes(args[0].toLowerCase()) 
                ? args[0].toLowerCase() 
                : 'hunt';

            const payload = buildGoalsPayload(userId, initialCategory, username, avatarURL);
            const menuMessage = await message.reply(payload);

            const collector = menuMessage.createMessageComponentCollector({ 
                idle: 60000 
            });

            collector.on('collect', async (interaction) => {
                const targetUserId = interaction.customId.split('_').pop();

                if (interaction.user.id !== targetUserId) {
                    return interaction.reply({ content: '❌ Not your goal panel!', ephemeral: true });
                }

                if (interaction.isStringSelectMenu()) {
                    const selectedCategory = interaction.values[0];
                    const updatedPayload = buildGoalsPayload(targetUserId, selectedCategory, interaction.user.username, interaction.user.displayAvatarURL({ forceStatic: false, size: 256 }));
                    return await interaction.update(updatedPayload);
                }

                if (interaction.isButton()) {
                    const parts = interaction.customId.split('_');
                    const action = parts[1];
                    const btnCategory = parts[2];
                    const userGoalData = getOrCreateUserGoal(targetUserId, btnCategory);

                    if (action === 'add') {
                        await interaction.reply({ content: 'How much would you like to add? (Type a number between 1 and 1,000,000)', ephemeral: true });
                        
                        const filter = m => m.author.id === targetUserId;
                        const collectorFilter = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

                        collectorFilter.on('collect', async (m) => {
                            const amount = parseFloat(m.content.replace(/,/g, ''));
                            m.delete().catch(() => {});
                            
                            if (!isNaN(amount) && amount >= 1 && amount <= 1000000) {
                                userGoalData.current += amount;
                                saveGoalsData();

                                const updatedPayload = buildGoalsPayload(targetUserId, btnCategory, interaction.user.username, interaction.user.displayAvatarURL({ forceStatic: false, size: 256 }));
                                await menuMessage.edit(updatedPayload);
                            } else {
                                message.channel.send({ content: `<@${targetUserId}> ❌ Invalid amount! It must be a number between 1 and 1,000,000.` }).then(msg => {
                                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                                });
                            }
                        });
                    } else if (action === 'set') {
                        await interaction.reply({ content: 'What is your new target goal amount? (Type a number between 1 and 1,000,000)', ephemeral: true });
                        
                        const filter = m => m.author.id === targetUserId;
                        const collectorFilter = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

                        collectorFilter.on('collect', async (m) => {
                            const amount = parseFloat(m.content.replace(/,/g, ''));
                            m.delete().catch(() => {});
                            
                            if (!isNaN(amount) && amount >= 1 && amount <= 1000000) {
                                userGoalData.target = amount;
                                saveGoalsData();

                                const updatedPayload = buildGoalsPayload(targetUserId, btnCategory, interaction.user.username, interaction.user.displayAvatarURL({ forceStatic: false, size: 256 }));
                                await menuMessage.edit(updatedPayload);
                            } else {
                                message.channel.send({ content: `<@${targetUserId}> ❌ Invalid target! It must be a number between 1 and 1,000,000.` }).then(msg => {
                                    setTimeout(() => msg.delete().catch(() => {}), 5000);
                                });
                            }
                        });
                    } else if (action === 'reset') {
                        userGoalData.current = 0;
                        saveGoalsData();

                        const updatedPayload = buildGoalsPayload(targetUserId, btnCategory, interaction.user.username, interaction.user.displayAvatarURL({ forceStatic: false, size: 256 }));
                        await interaction.update(updatedPayload);
                    }
                }
            });

            collector.on('end', () => {
                menuMessage.edit({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('[GOALS COMMAND ERROR]:', error);
        }
    }
};
