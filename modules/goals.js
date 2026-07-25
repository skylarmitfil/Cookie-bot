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

// Storage Initialization
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

function matchesTrigger(content, triggers) {
  return triggers.some(trigger => content === trigger || content.startsWith(trigger + ' '));
}

function getOrCreateUserGoal(userId, category) {
  if (!userGoals.has(userId)) {
    userGoals.set(userId, {});
  }
  const userMap = userGoals.get(userId);
  if (!userMap[category]) {
    userMap[category] = { target: 0, current: 0, lastMilestone: 0 };
    saveGoalsData();
  }
  if (userMap[category].lastMilestone === undefined) {
    userMap[category].lastMilestone = 0;
  }
  return userMap[category];
}

function createProgressBar(current, target, length = 10) {
  const LEFT_FILLED  = '<:blue_left_rounded:1530551328059953243>';
  const MID_FILLED   = '<:blue:1530551332715499661>';
  const RIGHT_FILLED = '<:SS_blue_right_rounded:1530551323337166879>';

  const LEFT_EMPTY   = '<:SS_white_left_rounded:1530551337261989898>';
  const MID_EMPTY    = '<:white:1530551348079366174>';
  const RIGHT_EMPTY  = '<:SS_white_right_rounded:1530551341947289630>';

  if (target <= 0 || current <= 0) {
    return LEFT_EMPTY + MID_EMPTY.repeat(length - 2) + RIGHT_EMPTY;
  }

  const percentage = Math.min(Math.max(current / target, 0), 1);
  const totalFilledSegments = Math.round(length * percentage);
  let bar = '';

  bar += (totalFilledSegments >= 1) ? LEFT_FILLED : LEFT_EMPTY;

  for (let i = 1; i < length - 1; i++) {
    bar += (i < totalFilledSegments) ? MID_FILLED : MID_EMPTY;
  }

  bar += (totalFilledSegments >= length) ? RIGHT_FILLED : RIGHT_EMPTY;

  return bar;
}

function scheduleGoalReminder(message, userId, category) {
  let cooldownTime = 15000;
  if (category === 'pray' || category === 'curse') {
    cooldownTime = 5 * 60 * 1000;
  }
  setTimeout(async () => {
    try {
      const channel = message.channel;
      if (channel) {
        const reminderEmbed = new EmbedBuilder()
          .setColor(0x00AE86)
          .setDescription(`⏰ **Reminder:** Your completed **${category.toUpperCase()}** cycle cooldown is over! You can start a new goal now.`);
        const notificationMsg = await channel.send({ content: `🔔 <@${userId}>, your goal reminder is up!`, embeds: [reminderEmbed] });
        setTimeout(() => notificationMsg.delete().catch(() => {}), 5000);
      }
    } catch (err) {
      console.error('[REMINDER SYSTEM ERROR]:', err.message);
    }
  }, cooldownTime);
}
function checkAndUpdateGoal(userId, category, message) {
  const data = getOrCreateUserGoal(userId, category);
  
  if (!data.target || data.target <= 0) {
    return { data, notification: null };
  }

  data.current += 1;
  let notification = null;

  const isNewlyCompleted = data.current >= data.target && data.lastMilestone < data.target;
  const currentMilestone = Math.floor(data.current / 50) * 50;
  const isMilestoneReached = currentMilestone > 0 && currentMilestone > data.lastMilestone;

  if (isNewlyCompleted || isMilestoneReached) {
    data.lastMilestone = isNewlyCompleted ? Math.max(data.target, currentMilestone) : currentMilestone;
    
    const percentage = ((data.current / data.target) * 100).toFixed(1);
    const progressBar = createProgressBar(data.current, data.target);
    const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1);

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setDescription(`**Goal: ${capitalizedCategory}** 🎯 target \`${Number(data.current).toLocaleString()}/${Number(data.target).toLocaleString()}\` (${percentage}%)\n${progressBar}`);

    if (isNewlyCompleted) {
      embed.addFields({ 
        name: '🔄 Goal Auto-Reset', 
        value: `Your **${capitalizedCategory}** progress has been reset to \`0/0\`.\nUse \`.goal set ${category} <amount>\` to start a new track!` 
      });

      notification = { 
        content: `🏆 <@${userId}> **COMPLETED** their **${category.toUpperCase()}** goal of **${Number(data.target).toLocaleString()}**! 🎉🎉`, 
        embeds: [embed] 
      };
      
      scheduleGoalReminder(message, userId, category);

      // AUTO-RESET LOGIC: Clear track layout parameters back to empty state
      data.target = 0;
      data.current = 0;
      data.lastMilestone = 0;
    } else {
      notification = { 
        content: `🎉 <@${userId}> reached **${currentMilestone}** progress in **${category.toUpperCase()}**!`, 
        embeds: [embed] 
      };
    }
  }

  saveGoalsData();
  return { data, notification };
}

module.exports = {
  name: 'goal',
  checkAndUpdateGoal,
  async handleMessage(message) {
    if (message.author.bot) return;
    const content = message.content.trim().toLowerCase();
    const userId = message.author.id;
    let result = null;

    if (matchesTrigger(content, HUNT_TRIGGERS)) {
      result = checkAndUpdateGoal(userId, 'hunt', message);
    } else if (matchesTrigger(content, BATTLE_TRIGGERS)) {
      result = checkAndUpdateGoal(userId, 'battle', message);
    } else if (matchesTrigger(content, PRAY_TRIGGERS)) {
      result = checkAndUpdateGoal(userId, 'pray', message);
    } else if (matchesTrigger(content, CURSE_TRIGGERS)) {
      result = checkAndUpdateGoal(userId, 'curse', message);
    } else if (matchesTrigger(content, OWO_TRIGGERS)) {
      result = checkAndUpdateGoal(userId, 'owo', message);
    }

    if (result && result.notification) {
      await message.channel.send(result.notification);
    }
  },
  async execute(message, args) {
    try {
      const userId = message.author.id;
      const subCommand = args && args[0] ? args[0].toLowerCase() : null;

      if (subCommand === 'set') {
        if (!args[1]) {
          return message.reply('❌ **Error:** You must specify a category to set.\nExample: `.goal set hunt 5000`');
        }
        const category = args[1].toLowerCase();
        if (!VALID_CATEGORIES.includes(category)) {
          return message.reply('❌ **Error:** Invalid category! Pick: `Hunt`, `Battle`, `Pray`, `Curse`, or `OwO`.');
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

      if (subCommand === 'reset') {
        if (!args[1]) {
          return message.reply('❌ **Error:** Specify a category to reset, or use `all`.\nExample: `.goal reset hunt` or `.goal reset all`');
        }
        const targetReset = args[1].toLowerCase();

        if (targetReset === 'all') {
          userGoals.set(userId, {});
          saveGoalsData();
          return message.reply('🔄 **Success:** All your goal tracking profiles have been completely reset to 0!');
        }

        if (!VALID_CATEGORIES.includes(targetReset)) {
          return message.reply('❌ **Error:** Invalid category! Pick: `Hunt`, `Battle`, `Pray`, `Curse`, `OwO`, or `all`.');
        }

        if (userGoals.has(userId)) {
          const userMap = userGoals.get(userId);
          userMap[targetReset] = { target: 0, current: 0, lastMilestone: 0 };
          saveGoalsData();
        }

        const capitalizedCategory = targetReset.charAt(0).toUpperCase() + targetReset.slice(1);
        return message.reply(`🔄 **Success:** Your **${capitalizedCategory}** goal has been reset to 0.`);
      }

      // Default profile display view
      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle(`🎯 ${message.author.username}'s Goals`);

      let description = '';
      const userMap = userGoals.get(userId) || {};

      for (const cat of VALID_CATEGORIES) {
        const data = userMap[cat] ? userMap[cat] : { current: 0, target: 0 };
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
