const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const COMPONENTS_V2_FLAG = 32768;
const OWO_BOT_ID = '408785106942115840';

/**
 * Recursively extracts text content and labels from Discord v2 / action row components.
 */
function extractComponentsText(components, acc = []) {
  if (!Array.isArray(components)) return acc;
  for (const comp of components) {
    if (!comp) continue;
    const raw = comp.data || comp;

    if (typeof comp.content === 'string' && comp.content.trim()) acc.push(comp.content);
    else if (typeof raw.content === 'string' && raw.content.trim()) acc.push(raw.content);

    if (typeof comp.label === 'string' && comp.label.trim()) acc.push(comp.label);
    else if (typeof raw.label === 'string' && raw.label.trim()) acc.push(raw.label);

    const nested = comp.components || raw.components;
    if (nested) extractComponentsText(nested, acc);
  }
  return acc;
}

/**
 * Safely increments progress for a specific active quest.
 * Keeps completed status capped at `total/total` so `.q` can display it.
 */
function incrementQuest(db, userId, username, type) {
  const key = `${userId}_all_quests`;
  const data = db.get(key) || db.get(userId) || {
    userId,
    username,
    quests: {}
  };

  const quest = data.quests[type];
  if (!quest) return false;

  if (quest.done < quest.total) {
    quest.done++;
    quest.timestamp = Date.now();

    if (quest.done > quest.total) {
      quest.done = quest.total;
    }

    db.set(key, data);
    db.set(userId, data);
    return true;
  }

  return false;
}

/**
 * Builds the interactive v2 components embed payload for the quest display menu.
 */
function buildQuestPayload(db, targetUserId, fallbackUsername, selectedKey = 'all_quests', disabled = false) {
  const allKey = `${targetUserId}_all_quests`;
  const userAllData = db.get(allKey) || db.get(targetUserId) || { userId: targetUserId, username: fallbackUsername, quests: {} };
  const savedQuests = userAllData.quests || {};
  const username = userAllData.username || fallbackUsername;
  const currentUserId = userAllData.userId || targetUserId;

  const hasPray = Boolean(savedQuests.pray);
  const hasCurse = Boolean(savedQuests.curse);
  const hasAction = Boolean(savedQuests.action);
  const hasAnyQuest = hasPray || hasCurse || hasAction;

  let allText = `### Quests\n\n`;
  if (hasAnyQuest) {
    if (hasPray) allText += `┃ ${username} (pray) \`${currentUserId}\` \`${savedQuests.pray.done}/${savedQuests.pray.total}\`\n`;
    if (hasCurse) allText += `┃ ${username} (curse) \`${currentUserId}\` \`${savedQuests.curse.done}/${savedQuests.curse.total}\`\n`;
    if (hasAction) allText += `┃ ${username} (action) \`${currentUserId}\` \`${savedQuests.action.done}/${savedQuests.action.total}\`\n`;
    allText = allText.trimEnd();
  } else {
    allText += `**All Quests:**\n┃ No active quests tracked yet.`;
  }

  const prayText = `### Quests\n\n**Pray Quests:**\n` +
    (hasPray ? `┃ ${username} (pray) \`${currentUserId}\` \`${savedQuests.pray.done}/${savedQuests.pray.total}\`` : `┃ No active pray quest.`);
  const curseText = `### Quests\n\n**Curse Quests:**\n` +
    (hasCurse ? `┃ ${username} (curse) \`${currentUserId}\` \`${savedQuests.curse.done}/${savedQuests.curse.total}\`` : `┃ No active curse quest.`);
  const actionText = `### Quests\n\n**Action Quests:**\n` +
    (hasAction ? `┃ ${username} (action) \`${currentUserId}\` \`${savedQuests.action.done}/${savedQuests.action.total}\`` : `┃ No active action quest.`);

  const contents = {
    all_quests: allText,
    pray_quests: prayText,
    curse_quests: curseText,
    action_quests: actionText
  };

  return {
    flags: COMPONENTS_V2_FLAG,
    components: [
      {
        type: 17,
        accent_color: 14430780,
        components: [
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: `quest_menu_v2:${currentUserId}`,
                placeholder: 'All quests list',
                disabled: disabled,
                options: [
                  { label: 'All quests list', description: 'View all available quests', value: 'all_quests', emoji: { id: null, name: '📜' }, default: selectedKey === 'all_quests' },
                  { label: 'Pray Quests', description: 'View pray quest details', value: 'pray_quests', emoji: { id: null, name: '🙏' }, default: selectedKey === 'pray_quests' },
                  { label: 'Curse Quests', description: 'View curse quest details', value: 'curse_quests', emoji: { id: null, name: '👻' }, default: selectedKey === 'curse_quests' },
                  { label: 'Action Quests', description: 'View action quest details', value: 'action_quests', emoji: { id: null, name: '🎭' }, default: selectedKey === 'action_quests' }
                ]
              }
            ]
          },
          { type: 14 },
          { type: 10, content: contents[selectedKey] }
        ]
      }
    ]
  };
}

module.exports = {
  name: 'q',
  description: 'Displays quest information and tracking status.',

  buildQuestPayload,
  incrementQuest,

  init: (client) => {
    if (!client.questDatabase) client.questDatabase = new Map();
    if (!client.recentQuestActivity) client.recentQuestActivity = new Map();
  },

  handleSelectMenu: async (interaction) => {
    if (!interaction || typeof interaction.customId !== 'string') return;
    if (!interaction.customId.startsWith('quest_menu_v2')) return;

    const db = interaction.client.questDatabase || new Map();
    const [, targetUserId] = interaction.customId.split(':');
    const userId = targetUserId || interaction.user.id;
    const selectedKey = (interaction.values && interaction.values[0]) || 'all_quests';

    try {
      const payload = buildQuestPayload(db, userId, interaction.user.username, selectedKey, false);
      await interaction.update(payload);
    } catch (err) {
      console.error('Failed to update quest menu:', err);
    }
  },

  execute: async (message, args = []) => {
    if (!message) return;

    const db = message.client.questDatabase || new Map();
    const activity = message.client.recentQuestActivity || new Map();

    const content = (message.content || '').toLowerCase().trim();
    const slashName = message.interactionMetadata?.name?.toLowerCase() || '';

    if (message.author && !message.author.bot) {
      const lowCont = message.content.toLowerCase();
      if (lowCont.includes("owo") || lowCont.includes("uwu") || lowCont.startsWith("w")) {
        activity.set(message.channelId, {
          id: message.author.id,
          username: message.author.username,
          timestamp: Date.now()
        });
      }
    }

    const isQuestCommand =
      slashName === 'q' ||
      slashName === 'quest' ||
      content === '.q' ||
      content === '.quest';

    if (!isQuestCommand) return;

    try {
      const userId = message.author.id;
      const payload = buildQuestPayload(db, userId, message.author.username, 'all_quests', false);

      if (typeof message.reply === 'function' && !message.deferred && !message.replied) {
        await message.reply(payload);
      } else if (message.channel && typeof message.channel.send === 'function') {
        await message.channel.send(payload);
      }
    } catch (error) {
      console.error('Error executing quests command:', error);
    }
  },

  handleIncomingQuests: async (message) => {
    if (!message) return null;

    const db = message.client.questDatabase || new Map();
    const activity = message.client.recentQuestActivity || new Map();

    // 1. Log active human user context before filtering out bots
    if (message.author && !message.author.bot) {
      const lowCont = message.content.toLowerCase();
      if (lowCont.includes("owo") || lowCont.includes("uwu") || lowCont.startsWith("w")) {
        activity.set(message.channelId, {
          id: message.author.id,
          username: message.author.username,
          timestamp: Date.now()
        });
      }
      return null;
    }

    if (!message.author || !message.author.bot) return null;
    if (message.client.user && message.author.id === message.client.user.id) return null;

    // 2. Extract full readable text across messages, embeds, and components
    let textToCheck = message.content || '';
    if (message.embeds && message.embeds.length > 0) {
      for (const embed of message.embeds) {
        if (embed.description) textToCheck += '\n' + embed.description;
        if (embed.title) textToCheck += '\n' + embed.title;
        if (embed.footer && embed.footer.text) textToCheck += '\n' + embed.footer.text;
        if (embed.author && embed.author.name) textToCheck += '\n' + embed.author.name;
        if (embed.fields) {
          for (const field of embed.fields) {
            textToCheck += `\n${field.name} ${field.value}`;
          }
        }
      }
    }

    if (message.components && message.components.length > 0) {
      const parts = extractComponentsText(message.components);
      if (parts.length) textToCheck += '\n' + parts.join('\n');
    }

    if (!textToCheck) return null;

    const cleanContent = textToCheck.replace(/\s+/g, ' ').trim();
    const lowerContent = cleanContent.toLowerCase();

    // 3. Early check for Quest Log output to prevent false action triggers
    const hasProgress = /\d+\s*\/\s*\d+/.test(cleanContent);
    const isQuestLog = lowerContent.includes('quest log') || lowerContent.includes('quest seals') || (hasProgress && lowerContent.includes('quest'));

    let userId = null;
    let username = 'user';

    if (message.interactionMetadata?.user) {
      userId = message.interactionMetadata.user.id;
      username = message.interactionMetadata.user.username;
    }

    if (!userId && message.reference) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedMsg && !repliedMsg.author.bot) {
          userId = repliedMsg.author.id;
          username = repliedMsg.author.username;
        }
      } catch (e) {}
    }

    if (!userId) {
      const recentUser = activity.get(message.channelId);
      if (recentUser && Date.now() - recentUser.timestamp < 120000) {
        userId = recentUser.id;
        username = recentUser.username;
      }
    }

    if (!userId) return null;

    const isOwOBot = message.author.id === OWO_BOT_ID;

    // 4. Handle single Pray / Curse / Action increments (Skipped if message is a Quest Log)
    if (isOwOBot && !isQuestLog) {
      const actionWords = [
        "hug", "pat", "kiss", "cuddle", "slap", "poke", "lick",
        "nom", "bite", "highfive", "tickle", "handhold", "handholding",
        "snuggle", "boop", "wave", "punch", "dance", "cry",
        "smile", "blush", "stare", "feed"
      ];

      const isAction = actionWords.some(word =>
        lowerContent.includes(word) &&
        (
          lowerContent.includes("you") ||
          lowerContent.includes("hug") ||
          lowerContent.includes("kiss") ||
          lowerContent.includes("cuddle")
        )
      );

      let incremented = false;

      if (lowerContent.includes("you prayed") || lowerContent.includes("you pray")) {
        incremented = incrementQuest(db, userId, username, "pray") || incremented;
      }

      if (lowerContent.includes("you cursed") || lowerContent.includes("you curse")) {
        incremented = incrementQuest(db, userId, username, "curse") || incremented;
      }

      if (isAction) {
        incremented = incrementQuest(db, userId, username, "action") || incremented;
      }

      if (incremented) {
        try {
          await message.react('1532147975587893460');
        } catch (err) {
          console.error('Failed to react to action message:', err);
        }

        const allKey = `${userId}_all_quests`;
        return db.get(allKey);
      }
    }

    // 5. Handle Quest Log Parsing
    if (!isQuestLog) return null;

    let helperId = null;

    if (!userId && message.embeds && message.embeds.length > 0) {
      for (const embed of message.embeds) {
        const embedAuthorText = (embed.author?.name || '').toLowerCase();
        if (embedAuthorText.includes('quest log')) {
          const rawAuthorName = embed.author.name;
          const matchName = rawAuthorName.match(/@?([^'’]+)(?:'s|’s)?\s*Quest Log/i);
          if (matchName) {
            const targetName = matchName[1].trim();
            for (const [chanId, act] of activity.entries()) {
              if (act.username.toLowerCase() === targetName.toLowerCase()) {
                userId = act.id;
                username = act.username;
                helperId = act.id;
                break;
              }
            }
          }
        }
      }
    }

    if (!userId && message.channel?.messages) {
      try {
        const messagesLog = await message.channel.messages.fetch({ limit: 15 });
        const lastHumanMsg = messagesLog.find(msg => !msg.author.bot);
        if (lastHumanMsg) {
          userId = lastHumanMsg.author.id;
          username = lastHumanMsg.author.username;
          helperId = lastHumanMsg.author.id;
        }
      } catch (e) {}
    }

    if (!userId) return null;

    const allKey = `${userId}_all_quests`;
    let userAllData = db.get(allKey) || db.get(userId) || { userId, username, quests: {} };
    userAllData.userId = userId;
    userAllData.username = username;

    let anyUpdated = false;
    let lastUpdatedType = '';
    let lastDone = 0;
    let lastTotal = 1;

    const sections = cleanContent.split(/(?=\d+\.\s+)/);

    for (const section of sections) {
      const lowerSec = section.toLowerCase();
      const match = section.match(/(\d+)\s*\/\s*(\d+)/);
      if (!match) continue;

      const done = parseInt(match[1] || '0', 10);
      const total = parseInt(match[2] || '1', 10);

      if (lowerSec.includes('pray') || lowerSec.includes('🙏')) {
        userAllData.quests.pray = { questType: 'pray', done, total, timestamp: Date.now() };
        anyUpdated = true;
        lastUpdatedType = 'pray';
        lastDone = done;
        lastTotal = total;
      } else if (lowerSec.includes('curse') || lowerSec.includes('👻')) {
        userAllData.quests.curse = { questType: 'curse', done, total, timestamp: Date.now() };
        anyUpdated = true;
        lastUpdatedType = 'curse';
        lastDone = done;
        lastTotal = total;
      } else if (lowerSec.includes('action') || lowerSec.includes('🎭')) {
        userAllData.quests.action = { questType: 'action', done, total, timestamp: Date.now() };
        anyUpdated = true;
        lastUpdatedType = 'action';
        lastDone = done;
        lastTotal = total;
      }
    }

    if (!anyUpdated) {
      const globalMatches = [...cleanContent.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
      if (globalMatches.length > 0) {
        const lastMatch = globalMatches.pop();
        const done = parseInt(lastMatch[1] || '0', 10);
        const total = parseInt(lastMatch[2] || '1', 10);
        lastDone = done;
        lastTotal = total;

        if (lowerContent.includes('curse')) {
          userAllData.quests.curse = { questType: 'curse', done, total, timestamp: Date.now() };
          anyUpdated = true;
          lastUpdatedType = 'curse';
        } else if (lowerContent.includes('pray')) {
          userAllData.quests.pray = { questType: 'pray', done, total, timestamp: Date.now() };
          anyUpdated = true;
          lastUpdatedType = 'pray';
        } else if (lowerContent.includes('action')) {
          userAllData.quests.action = { questType: 'action', done, total, timestamp: Date.now() };
          anyUpdated = true;
          lastUpdatedType = 'action';
        }
      }
    }

    if (anyUpdated) {
      db.set(allKey, userAllData);
      db.set(userId, userAllData);

      const isCompleted = lastTotal > 0 && lastDone >= lastTotal;

      try {
        await message.react('1532147975587893460');
      } catch (err) {
        console.error('Failed to react to quest message:', err);
      }

      try {
        let announcementText = `<:up:1532147975587893460> **Quest Tracked:** ${username} (${lastUpdatedType}) \`${userId}\` \`${lastDone}/${lastTotal}\``;

        if (isCompleted) {
          announcementText += ` 🎉 **Quest Completed!**`;
          if (helperId && helperId !== userId) {
            announcementText += ` (Helped by <@${helperId}>)`;
          }
        }

        await message.channel.send(announcementText);
      } catch (err) {
        console.error('Failed to send quest notification:', err);
      }

      return userAllData;
    }

    return null;
  }
};
