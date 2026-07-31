const { createWorker } = require('tesseract.js');

const COMPONENTS_V2_FLAG = 32768;
const ACTIVITY_TTL_MS = 600000;

const QUEST_TYPES = [
  { type: 'pray', emoji: '🙏', keywords: ['pray', '🙏'] },
  { type: 'curse', emoji: '👻', keywords: ['curse', '👻'] },
  { type: 'action', emoji: '🎭', keywords: ['action', 'battle', 'hunt', 'gamble', '🎭'] }
];

let _workerPromise = null;
function getOcrWorker() {
  if (!_workerPromise) _workerPromise = createWorker('eng');
  return _workerPromise;
}

function isStaticImage(att) {
  const type = (att.contentType || '').toLowerCase();
  const name = (att.name || '').toLowerCase();
  return (type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/.test(name)) &&
    type !== 'image/gif' && !name.endsWith('.gif');
}

async function ocrImageAttachments(message) {
  if (!message.attachments || message.attachments.size === 0) return '';

  let text = '';
  for (const att of message.attachments.values()) {
    if (!isStaticImage(att)) continue;
    try {
      const worker = await getOcrWorker();
      const { data } = await worker.recognize(att.url);
      if (data && data.text) text += '\n' + data.text;
    } catch (err) {
      console.error('OCR failed for attachment:', att.url, err);
    }
  }
  return text;
}

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

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseQuests(text) {
  const hits = [];
  for (const { type, keywords } of QUEST_TYPES) {
    for (const kw of keywords) {
      const re = new RegExp(escapeRegExp(kw), 'gi');
      let m;
      while ((m = re.exec(text)) !== null) {
        hits.push({ type, index: m.index });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  }
  hits.sort((a, b) => a.index - b.index);

  const results = {};
  for (let i = 0; i < hits.length; i++) {
    const { type, index } = hits[i];
    if (results[type]) continue;

    let end = text.length;
    for (let j = i + 1; j < hits.length; j++) {
      if (hits[j].type !== type) { end = hits[j].index; break; }
    }

    const fm = text.slice(index, end).match(/(\d+)\s*\/\s*(\d+)/);
    if (fm) results[type] = { type, done: parseInt(fm[1] || '0', 10), total: parseInt(fm[2] || '1', 10) };
  }
  return Object.values(results);
}

function questLine(num, username, emoji, id, q) {
  const check = (q.total > 0 && q.done >= q.total) ? ' ✅' : '';
  return `\`#${num}\` ${username} ${emoji} \`${id}\` \`${q.done}/${q.total}\`${check}`;
}

function buildQuestPayload(db, targetUserId, fallbackUsername, selectedKey = 'all_quests', disabled = false) {
  const allKey = `${targetUserId}_all_quests`;
  const userAllData = db.get(allKey) || { userId: targetUserId, username: fallbackUsername, quests: {} };
  const savedQuests = userAllData.quests || {};
  const username = userAllData.username || fallbackUsername;
  const currentUserId = userAllData.userId || targetUserId;

  const hasPray = Boolean(savedQuests.pray);
  const hasCurse = Boolean(savedQuests.curse);
  const hasAction = Boolean(savedQuests.action);
  const hasAnyQuest = hasPray || hasCurse || hasAction;

  let allText = `### Quests\n\n`;
  if (hasAnyQuest) {
    let n = 0;
    if (hasPray) allText += questLine(++n, username, '🙏', currentUserId, savedQuests.pray) + '\n';
    if (hasCurse) allText += questLine(++n, username, '👻', currentUserId, savedQuests.curse) + '\n';
    if (hasAction) allText += questLine(++n, username, '🎭', currentUserId, savedQuests.action) + '\n';
    allText = allText.trimEnd();
  } else {
    allText += `**All Quests:**\nNo active quests tracked yet.`;
  }

  const prayText = `### Quests\n\n**Pray Quests:**\n` +
    (hasPray ? questLine(1, username, '🙏', currentUserId, savedQuests.pray) : `No active pray quest.`);
  const curseText = `### Quests\n\n**Curse Quests:**\n` +
    (hasCurse ? questLine(1, username, '👻', currentUserId, savedQuests.curse) : `No active curse quest.`);
  const actionText = `### Quests\n\n**Action Quests:**\n` +
    (hasAction ? questLine(1, username, '🎭', currentUserId, savedQuests.action) : `No active action quest.`);

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
  description: 'Displays quest information and tracking help.',

  buildQuestPayload,

  init: (client) => {
    if (!client.questDatabase) client.questDatabase = new Map();
    if (!client.recentQuestActivity) client.recentQuestActivity = new Map();
    getOcrWorker().catch(err => console.error('OCR worker init failed:', err));
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
      activity.set(message.channelId, {
        id: message.author.id,
        username: message.author.username,
        timestamp: Date.now()
      });
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

    if (message.author?.bot && message.author.id !== message.client.user?.id) {
      console.log('=== QUEST DEBUG ===');
      console.log('author:', message.author.username);
      console.log('content:', JSON.stringify(message.content));
      console.log('embeds:', JSON.stringify((message.embeds || []).map(e => ({
        title: e.title, description: e.description, author: e.author, fields: e.fields, footer: e.footer
      }))));
      console.log('components:', JSON.stringify(message.components, (k, v) => k === 'client' ? undefined : v));
      console.log('attachments:', [...(message.attachments?.values?.() || [])].map(a => ({ name: a.name, ct: a.contentType, url: a.url })));
      console.log('interaction:', message.interactionMetadata ? { name: message.interactionMetadata.name, user: message.interactionMetadata.user?.username } : null);
      console.log('=== END DEBUG ===');
    }

    const db = message.client.questDatabase || new Map();
    const activity = message.client.recentQuestActivity || new Map();

    const isHuman = Boolean(message.author && !message.author.bot);

    const hasImage = message.attachments && message.attachments.size > 0 &&
      [...message.attachments.values()].some(isStaticImage);

    if (isHuman) {
      activity.set(message.channelId, {
        id: message.author.id,
        username: message.author.username,
        timestamp: Date.now()
      });
      if (!hasImage) return null;
    }

    if (!message.author) return null;

    if (message.client.user && message.author.id === message.client.user.id) return null;

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

    const alreadyHasQuest = /\d+\s*\/\s*\d+/.test(textToCheck) || textToCheck.toLowerCase().includes('quest');
    if (hasImage && !alreadyHasQuest) {
      const ocrText = await ocrImageAttachments(message);
      if (ocrText) textToCheck += '\n' + ocrText;
    }

    if (!textToCheck) return null;

    const cleanContent = textToCheck.replace(/\s+/g, ' ').trim();
    const lowerContent = cleanContent.toLowerCase();

    const hasProgress = /\d+\s*\/\s*\d+/.test(cleanContent);
    const isQuestLog = lowerContent.includes('quest') ||
      (hasProgress && (lowerContent.includes('pray') || lowerContent.includes('curse')));

    if (!isQuestLog) return null;

    let userId = null;
    let username = 'user';
    let helperId = null;

    if (message.interactionMetadata?.user) {
      userId = message.interactionMetadata.user.id;
      username = message.interactionMetadata.user.username;
    }

    if (!userId && isHuman) {
      userId = message.author.id;
      username = message.author.username;
    }

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

    if (!userId && message.reference) {
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedMsg && !repliedMsg.author.bot) {
          userId = repliedMsg.author.id;
          username = repliedMsg.author.username;
          helperId = repliedMsg.author.id;
        }
      } catch (e) {}
    }

    if (!userId) {
      const recentUser = activity.get(message.channelId);
      if (recentUser && Date.now() - recentUser.timestamp < ACTIVITY_TTL_MS) {
        userId = recentUser.id;
        username = recentUser.username;
        helperId = recentUser.id;
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
    let userAllData = db.get(allKey) || { userId, username, quests: {} };
    userAllData.userId = userId;
    userAllData.username = username;

    const parsed = parseQuests(cleanContent);
    if (parsed.length === 0) return null;

    let lastUpdatedType = '';
    let lastDone = 0;
    let lastTotal = 1;

    for (const q of parsed) {
      userAllData.quests[q.type] = { questType: q.type, done: q.done, total: q.total, timestamp: Date.now() };
      lastUpdatedType = q.type;
      lastDone = q.done;
      lastTotal = q.total;
    }

    db.set(allKey, userAllData);

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
};
