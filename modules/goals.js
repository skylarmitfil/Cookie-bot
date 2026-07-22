const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const DATA_DIR = '/app/data';
const GOALS_FILE = path.join(DATA_DIR, 'userGoals.json');
let userGoals = new Map();

const VALID_CATEGORIES = ['hunt', 'battle', 'pray', 'curse', 'owo'];
const HUNT_TRIGGERS = ['owo hunt', 'owoh', 'owo h', 'wh', 'w h'];
const BATTLE_TRIGGERS = ['owo battle', 'owob', 'owo b', 'wb', 'w b'];
const PRAY_TRIGGERS = ['owo pray', 'w pray'];
const CURSE_TRIGGERS = ['owo curse', 'w curse'];
const OWO_TRIGGERS = ['owo', 'uwu'];

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
            target: 0,
            current: 0,
            lastMilestone: 0
        };
        saveGoalsData();
    }
    if (userMap[category].lastMilestone === undefined) {
        userMap[category].lastMilestone = 0;
    }
    return userMap[category];
}

function createProgressBar(current, target, length = 10) {
    if (target <= 0) return '▬'.repeat(length);
    const percentage = Math.min(Math.max(current / target, 0), 1);
    const progress = Math.round(length * percentage);
    const empty = length - progress;
    return '🟦'.repeat(progress) + '▬'.repeat(empty);
}

function checkAndUpdateGoal(userId, category, incrementAmount = 1) {
    const data = getOrCreateUserGoal(userId, category);
    data.current += incrementAmount;

    let notification = null;

    const currentMilestone = Math.floor(data.current / 50) * 50;
    if (currentMilestone > 0 && currentMilestone > data.lastMilestone) {
        data.lastMilestone = currentMilestone;
        
        const percentage = data.target > 0 ? ((data.current / data.target) * 100).toFixed(1) : '0.0';
        const progressBar = createProgressBar(data.current, data.target);
        const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);

        const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setDescription(`**Goal: ${capitalizedCategory}** 🎯 target \`${Number(data.current).toLocaleString()}/${Number(data.target).toLocaleString()}\` (${percentage}%)\n${progressBar}`);

        notification = {
            content: `🎉 <@${userId}> reached **${currentMilestone}** progress in **${category.toUpperCase()}**!`,
            embeds: [embed]
        };
    }

    saveGoalsData();
    return { data, notification };
}

module.exports = {
    name: 'goal',
    checkAndUpdateGoal,
    HUNT_TRIGGERS,
    BATTLE_TRIGGERS,
    PRAY_TRIGGERS,
    CURSE_TRIGGERS,
    OWO_TRIGGERS,

    handleMessage(message) {
        if (message.author.bot) return;

        const content = message.content.trim().toLowerCase();

        // Check Hunt
        for (const trigger of HUNT_TRIGGERS) {
            if (content === trigger || content.startsWith(trigger + ' ')) {
                return checkAndUpdateGoal(message.author.id, 'hunt', 1);
            }
        }

        // Check Battle
        for (const trigger of BATTLE_TRIGGERS) {
            if (content === trigger || content.startsWith(trigger + ' ')) {
                return checkAndUpdateGoal(message.author.id, 'battle', 1);
            }
        }

        // Check Pray
        for (const trigger of PRAY_TRIGGERS) {
            if (content === trigger || content.startsWith(trigger + ' ')) {
                return checkAndUpdateGoal(message.author.id, 'pray', 1);
            }
        }

        // Check Curse
        for (const trigger of CURSE_TRIGGERS) {
            if (content === trigger || content.startsWith(trigger + ' ')) {
                return checkAndUpdateGoal(message.author.id, 'curse', 1);
            }
        }

        // Check OwO
        for (const trigger of OWO_TRIGGERS) {
            if (content === trigger || content.startsWith(trigger + ' ')) {
                return checkAndUpdateGoal(message.author.id, 'owo', 1);
            }
        }

        return null;
    },

    async execute(message, args) {
        try {
            const userId = message.author.id;

            // Handle ".goal set <category> <amount>"
            if (args && args.length > 0 && args[0].toLowerCase() === 'set') {
                if (!args[1]) {
                    return message.reply('❌ **Error:** You must specify a category to set.\nExample: `.goal set hunt 5000`');
                }

                const category = args[1].toLowerCase();
                if (!VALID_CATEGORIES.includes(category)) {
                    return message.reply('❌ **Error:** Invalid category! You must pick either `Hunt`, `Battle`, `Pray`, `Curse`, or `OwO`.');
                }

                if (!args[2]) {
                    return message.reply('❌ **Error:** You must specify a target amount.\nExample: `.goal set hunt 5000`');
                }

                const amount = parseFloat(args[2].replace(/,/g, ''));
                if (isNaN(amount) || amount < 0 || amount > 1000000) {
                    return message.reply(`❌ **Error:** Target goal must be a number between 0 and 1,000,000.`);
                }

                const data = getOrCreateUserGoal(userId, category);
                data.target = amount;
                saveGoalsData();

                const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);
                const percentage = data.target > 0 ? ((data.current / data.target) * 100).toFixed(1) : '0.0';
                const progressBar = createProgressBar(data.current, data.target);
                
                const embed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setDescription(`**Goal: ${capitalizedCategory}** 🎯 target \`${Number(data.current).toLocaleString()}/${Number(data.target).toLocaleString()}\` (${percentage}%)\n${progressBar}`);
                
                return message.reply({ embeds: [embed] });
            }

            // Handle ".goal" to display all goals in a single embed
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle(`🎯 ${message.author.username}'s Goals`);

            let description = '';
            for (const cat of VALID_CATEGORIES) {
                const userMap = userGoals.get(userId);
                const data = userMap && userMap[cat] ? userMap[cat] : { current: 0, target: 0 };
                const capitalizedCategory = cat.charAt(0).toUpperCase() + cat.slice(1);
                const percentage = data.target > 0 ? ((data.current / data.target) * 100).toFixed(1) : '0.0';
                const progressBar = createProgressBar(data.current, data.target);

                description += `**Goal: ${capitalizedCategory}** 🎯 target \`${Number(data.current).toLocaleString()}/${Number(data.target).toLocaleString()}\` (${percentage}%)\n${progressBar}\n\n`;
            }

            embed.setDescription(description.trim());
            return message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[GOAL COMMAND ERROR]:', error);
        }
    }
};
