const fs = require('fs');
const path = require('path');

const DATA_DIR = '/app/data';
const GOALS_FILE = path.join(DATA_DIR, 'userGoals.json');
let userGoals = new Map();

const VALID_CATEGORIES = ['hunt', 'battle', 'pray', 'curse', 'owo'];

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

function checkAndUpdateGoal(userId, category, incrementAmount = 1) {
    const data = getOrCreateUserGoal(userId, category);
    data.current += incrementAmount;

    let notification = null;

    const currentMilestone = Math.floor(data.current / 50) * 50;
    if (currentMilestone > 0 && currentMilestone > data.lastMilestone) {
        data.lastMilestone = currentMilestone;
        notification = `🎉 <@${userId}> reached **${currentMilestone}** progress in **${category.toUpperCase()}**!`;
    }

    saveGoalsData();
    return { data, notification };
}

module.exports = {
    name: 'goal',
    checkAndUpdateGoal,

    async execute(message, args) {
        try {
            if (!args || args.length < 1) {
                return message.reply('❌ **Error:** You must pick one of these categories: `Hunt`, `Battle`, `Pray`, `Curse`, or `OwO`.\nExample: `.goal hunt 5000`');
            }

            const category = args[0].toLowerCase();

            if (!VALID_CATEGORIES.includes(category)) {
                return message.reply('❌ **Error:** Invalid category! You must pick either `Hunt`, `Battle`, `Pray`, `Curse`, or `OwO`.');
            }

            const userId = message.author.id;
            const username = message.author.username;
            const data = getOrCreateUserGoal(userId, category);
            
            const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);

            if (!args[1]) {
                return message.reply(`**${username}'s Goal: ${capitalizedCategory}** target goal ${Number(data.target).toLocaleString()}`);
            }

            const amount = parseFloat(args[1].replace(/,/g, ''));
            if (!isNaN(amount) && amount >= 0 && amount <= 1000000) {
                data.target = amount;
                saveGoalsData();
                return message.reply(`**${username}'s Goal: ${capitalizedCategory}** target set ${Number(data.target).toLocaleString()}`);
            } else {
                return message.reply(`❌ **Error:** Target goal must be a number between 0 and 1,000,000.`);
            }

        } catch (error) {
            console.error('[GOAL COMMAND ERROR]:', error);
        }
    }
};
