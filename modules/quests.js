const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const localDatabaseMock = new Map(); 

module.exports = {
  name: 'q',
  description: 'Displays quest information and tracking help.',
  
  execute: async (message) => {
    if (!message) return;

    const content = (message.content || '').toLowerCase().trim();
    const slashName = message.interactionMetadata?.name?.toLowerCase() || '';

    const isQuestCommand = 
      slashName === 'q' ||
      slashName === 'quest' ||
      content === '.q' ||
      content === '.quest';

    if (!isQuestCommand) return;

    try {
      const prefix = '.'; 
      const userId = message.author.id;

      const userAllData = localDatabaseMock.get(`${userId}_all_quests`) || { username: message.author.username, quests: {} };
      const savedQuests = userAllData.quests || {};
      const username = userAllData.username || message.author.username;

      const hasPray = Boolean(savedQuests.pray);
      const hasCurse = Boolean(savedQuests.curse);
      const hasAction = Boolean(savedQuests.action);
      const hasAnyQuest = hasPray || hasCurse || hasAction;

      let allText = `### Quests\n\n`;

      if (hasAnyQuest) {
        if (hasPray) {
          const q = savedQuests.pray;
          allText += `┃ ${username} (pray) ${q.done}/${q.total}\n`;
        }
        if (hasCurse) {
          const q = savedQuests.curse;
          allText += `┃ ${username} (curse) ${q.done}/${q.total}\n`;
        }
        if (hasAction) {
          const q = savedQuests.action;
          allText += `┃ ${username} (action) ${q.done}/${q.total}\n`;
        }
        allText = allText.trimEnd();
      } else {
        allText += `**All Quests:**\n┃ No active quests tracked yet.`;
      }

      const prayText = `### Quests\n\n**Pray Quests:**\n` + 
        (hasPray ? `┃ ${username} (pray) ${savedQuests.pray.done}/${savedQuests.pray.total}` : `┃ No active pray quest.`);

      const curseText = `### Quests\n\n**Curse Quests:**\n` + 
        (hasCurse ? `┃ ${username} (curse) ${savedQuests.curse.done}/${savedQuests.curse.total}` : `┃ No active curse quest.`);

      const actionText = `### Quests\n\n**Action Quests:**\n` + 
        (hasAction ? `┃ ${username} (action) ${savedQuests.action.done}/${savedQuests.action.total}` : `┃ No active action quest.`);

      const contents = {
        all_quests: allText,
        pray_quests: prayText,
        curse_quests: curseText,
        action_quests: actionText
      };

      const buildV2Payload = (selectedKey = 'all_quests', disabled = false) => {
        return {
          flags: 32768, 
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
                      custom_id: 'quest_menu_v2',
                      placeholder: 'All quests list',
                      disabled: disabled,
                      options: [
                        {
                          label: 'All quests list',
                          description: 'View all available quests',
                          value: 'all_quests',
                          emoji: { id: null, name: '📜' },
                          default: selectedKey === 'all_quests'
                        },
                        {
                          label: 'Pray Quests',
                          description: 'View pray quest details',
                          value: 'pray_quests',
                          emoji: { id: null, name: '🙏' },
                          default: selectedKey === 'pray_quests'
                        },
                        {
                          label: 'Curse Quests',
                          description: 'View curse quest details',
                          value: 'curse_quests',
                          emoji: { id: null, name: '👻' },
                          default: selectedKey === 'curse_quests'
                        },
                        {
                          label: 'Action Quests',
                          description: 'View action quest details',
                          value: 'action_quests',
                          emoji: { id: null, name: '🎭' },
                          default: selectedKey === 'action_quests'
                        }
                      ]
                    }
                  ]
                },
                {
                  type: 14
                },
                {
                  type: 10,
                  content: contents[selectedKey]
                }
              ]
            }
          ]
        };
      };

      const payload = buildV2Payload('all_quests', false);

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

    if (!textToCheck) return null;

    const cleanContent = textToCheck.replace(/\s+/g, ' ').trim();
    const lowerContent = cleanContent.toLowerCase();

    // FIXED: Properly look up who initiated the command or response interaction
    let userId = null;
    let username = 'user';

    if (message.interactionMetadata?.user) {
      userId = message.interactionMetadata.user.id;
      username = message.interactionMetadata.user.username;
    } else if (message.reference) {
      // If it's a direct reply message, check the target reference author
      try {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedMsg && !repliedMsg.author.bot) {
          userId = repliedMsg.author.id;
          username = repliedMsg.author.username;
        }
      } catch (e) {}
    }

    // Fallback regex to grab user IDs out of plain-text tags or mentions inside the text stream
    if (!userId) {
      const mentionMatch = cleanContent.match(/<@!?(\d{17,20})>/);
      if (mentionMatch) {
        userId = mentionMatch[1];
        const userObj = message.client.users.cache.get(userId);
        if (userObj) username = userObj.username;
      }
    }

    // Default structural fallback safely ignoring pure bot-triggered accounts
    if (!userId && message.author && !message.author.bot) {
      userId = message.author.id;
      username = message.author.username;
    }

    if (!userId) return null;

    const allKey = `${userId}_all_quests`;
    let userAllData = localDatabaseMock.get(allKey);
    if (!userAllData) {
      userAllData = { userId, username, quests: {} };
    }
    
    userAllData.username = username;

    const progressMatch = cleanContent.match(/(\d+)\s*\/\s*(\d+)/);
    const done = progressMatch ? parseInt(progressMatch[1], 10) : 0;
    const total = progressMatch ? parseInt(progressMatch[2], 10) : 1; 

    let updated = false;

    if (lowerContent.includes('pray') || lowerContent.includes('🙏')) {
      userAllData.quests['pray'] = { questType: 'pray', done, total, timestamp: Date.now() };
      localDatabaseMock.set(`${userId}_pray`, userAllData.quests['pray']);
      updated = true;
    }

    if (lowerContent.includes('curse') || lowerContent.includes('👻')) {
      userAllData.quests['curse'] = { questType: 'curse', done, total, timestamp: Date.now() };
      localDatabaseMock.set(`${userId}_curse`, userAllData.quests['curse']);
      updated = true;
    }

    if (
      lowerContent.includes('action') || 
      lowerContent.includes('🎭') || 
      lowerContent.includes('receive an action from a friend') ||
      lowerContent.includes('action command') ||
      lowerContent.includes('use an action command')
    ) {
      userAllData.quests['action'] = { questType: 'action', done, total, timestamp: Date.now() };
      localDatabaseMock.set(`${userId}_action`, userAllData.quests['action']);
      updated = true;
    }

    if (updated) {
      localDatabaseMock.set(allKey, userAllData);
      return userAllData;
    }

    return null;
  }
};
