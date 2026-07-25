const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const DATA_DIR = '/app/data';
const GOALS_FILE = path.join(DATA_DIR, 'userGoals.json');
let userGoals = new Map();

// Anti-double count cooldown cache
const recentCounts = new Map();

const VALID_CATEGORIES = ['hb', 'pc', 'owo'];
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
    userMap[category] = { target: 0, current: 0, lastMilestone: 0, lastCommand: null };
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

function getCategoryDisplayName(category) {
  if (category === 'hb') return 'Hunt/Battle';
  if (category === 'pc') return 'Pray/Curse';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function checkAndUpdateGoal(userId, category, message, triggeredBy = null) {
  // ANTI-DOUBLE COUNT LOCK: Prevents identical increments within 2 seconds
  const lockKey = `${userId}-${category}-${triggeredBy || 'default'}`;
  const now = Date.now();
  if (recentCounts.has(lockKey) && now - recentCounts.get(lockKey) < 2000) {
    return { data: getOrCreateUserGoal(userId, category), notification: null };
  }
  recentCounts.set(lockKey, now);

  const data = getOrCreateUserGoal(userId, category);
  
  if (!data.target || data.target <= 0) {
    return { data, notification: null };
  }

  // Combo logic for Hunt/Battle (hb) or Pray/Curse (pc)
  if ((category === 'hb' || category === 'pc') && triggeredBy) {
    if (data.lastCommand === triggeredBy) {
      return { data, notification: null };
    }
    
    data.lastCommand = triggeredBy;

    const stateKey = `${category}_started`;
    if (data.lastCommand !== null && data.current === 0 && !userGoals.get(userId)[stateKey]) {
      userGoals.get(userId)[stateKey] = true;
      saveGoalsData();
      return { data, notification: null }; 
    }
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
    const displayName = getCategoryDisplayName(category);

    const embed = new EmbedBuilder()
      .setColor(0x00AE86)
      .setDescription(`**Goal: ${displayName}** 🎯 target \`${Number(data.current).toLocaleString()}/${Number(data.target).toLocaleString()}\` (${percentage}%)\n${progressBar}`);

    if (isNewlyCompleted) {
      notification = { 
        content: `🏆 <@${userId}> **COMPLETED** their **${displayName.toUpperCase()}** goal of **${Number(data.target).toLocaleString()}**! 🎉🎉`, 
        embeds: [embed] 
      };

      // AUTO-RESET LOGIC
      data.target = 0;
      data.current = 0;
      data.lastMilestone = 0;
      data.lastCommand = null;
      if (userGoals.get(userId)) {
        userGoals.get(userId).hb_started = false;
        userGoals.get(userId).pc_started = false;
      }
    } else {
      notification = { 
        content: `🎉 <@${userId}> reached **${currentMilestone}** progress in **${displayName.toUpperCase()}**!`, 
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
      result = checkAndUpdateGoal(userId, 'hb', message, 'hunt');
    } else if (matchesTrigger(content, BATTLE_TRIGGERS)) {
      result = checkAndUpdateGoal(userId, 'hb', message, 'battle');
    } else if (matchesTrigger(content, PRAY_TRIGGERS)) {
      result = checkAndUpdateGoal(userId, 'pc', message, 'pray');
    } else if (matchesTrigger(content, CURSE_TRIGGERS)) {
      result = checkAndUpdateGoal(userId, 'pc', message, 'curse');
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
          return message.reply('❌ **Error:** You must specify a category to set.\nExample: `.goal set hb 5000` or `.goal set pc 100`');
        }
        
        let category = args[1].toLowerCase();
        if (category === 'hunt' || category === 'battle' || category === 'hb') category = 'hb';
        if (category === 'pray' || category === 'curse' || category === 'pc') category = 'pc';

        if (!VALID_CATEGORIES.includes(category)) {
          return message.reply('❌ **Error:** Invalid category! Pick: `hb`, `pc`, or `OwO`.');
        }
        if (!args[2]) {
          return message.reply('❌ **Error:** You must specify a target amount.\nExample: `.goal set hb 5000`');
        }
        const amount = parseFloat(args[2].replace(/,/g, ''));
        if (isNaN(amount) || amount < 0 || amount > 1000000) {
          return message.reply(`❌ **Error:** Target goal must be a number between 0 and 1,000,000.`);
        }

        const data = getOrCreateUserGoal(userId, category);
        data.target = amount;
        data.current = 0;
        data.lastMilestone = 0;
        data.lastCommand = null;
        const userConfig = userGoals.get(userId);
        if (userConfig) userConfig[`${category}_started`] = false;
        saveGoalsData();

        const displayName = getCategoryDisplayName(category);
        const percentage = data.target > 0 ? ((data.current / data.target) * 100).toFixed(1) : '0.0';
        const progressBar = createProgressBar(data.current, data.target);

        const embed = new EmbedBuilder()
          .setColor(0x00AE86)
          .setDescription(`**Goal: ${displayName}** 🎯 target \`${Number(data.current).toLocaleString()}/${Number(data.target).toLocaleString()}\` (${percentage}%)\n${progressBar}`);

        return message.reply({ embeds: [embed] });
      }

      if (subCommand === 'reset') {
        if (!args[1]) {
          return message.reply('❌ **Error:** Specify a category to reset, or use `all`.\nExample: `.goal reset hb` or `.goal reset all`');
        }
        let targetReset = args[1].toLowerCase();
        if (targetReset === 'hunt' || targetReset === 'battle') targetReset = 'hb';
        if (targetReset === 'pray' || targetReset === 'curse') targetReset = 'pc';

        if (targetReset === 'all') {
          userGoals.set(userId, {});
          saveGoalsData();
          return message.reply('🔄 **Success:** All your goal tracking profiles have been completely reset to 0!');
        }

        if (!VALID_CATEGORIES.includes(targetReset)) {
          return message.reply('❌ **Error:** Invalid category! Pick: `hb`, `pc`, `OwO`, or `all`.');
        }

        if (userGoals.has(userId)) {
          const userMap = userGoals.get(userId);
          userMap[targetReset] = { target: 0, current: 0, lastMilestone: 0, lastCommand: null };
          saveGoalsData();
        }

        const displayName = getCategoryDisplayName(targetReset);
        return message.reply(`🔄 **Success:** Your **${displayName}** goal has been reset to 0.`);
      }

      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle(`🎯 ${message.author.username}'s Goals`);

      let description = '';
      const userMap = userGoals.get(userId) || {};

      for (const cat of VALID_CATEGORIES) {
        const data = userMap[cat] ? userMap[cat] : { current: 0, target: 0 };
        const displayName = getCategoryDisplayName(cat);
        const percentage = data.target > 0 ? ((data.current / data.target) * 100).toFixed(1) : '0.0';
        const progressBar = createProgressBar(data.current, data.target);

        description += `**Goal: ${displayName}** 🎯 target \`${Number(data.current).toLocaleString()}/${Number(data.target).toLocaleString()}\` (${percentage}%)\n${progressBar}\n\n`;
      }

      embed.setDescription(description.trim());
      return message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('[GOAL COMMAND ERROR]:', error);
    }
  }
};
