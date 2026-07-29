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

      const userAllData = localDatabaseMock.get(`${userId}_all_quests`) || { quests: {} };
      const savedQuests = userAllData.quests || {};

      const hasPray = Boolean(savedQuests.pray);
      const hasCurse = Boolean(savedQuests.curse);
      const hasAction = Boolean(savedQuests.action);
      const hasAnyQuest = hasPray || hasCurse || hasAction;

      let allText = `### Quests\n\n`;

      if (hasAnyQuest) {
        if (hasPray) {
          allText += `**Pray Quests:**\n┃ \`${prefix}q pray\` — View your pray quest status\n\n`;
        }
        if (hasCurse) {
          allText += `**Curse Quests:**\n┃ \`${prefix}q curse\` — View your curse quest status\n\n`;
        }
        if (hasAction) {
          allText += `**Action Quests:**\n┃ \`${prefix}q action\` — View your action quest status\n\n`;
        }
        allText = allText.trimEnd();
      } else {
        allText += `**All Quests:**\n` +
                   `┃ \`${prefix}q all\` — View all available quests and progress`;
      }

      const prayText = `### Quests\n\n` +
                       `**Pray Quests:**\n` +
                       `┃ \`${prefix}q pray\` — View your pray quest status`;

      const curseText = `### Quests\n\n` +
                        `**Curse Quests:**\n` +
                        `┃ \`${prefix}q curse\` — View your curse quest status`;

      const actionText = `### Quests\n\n` +
                         `**Action Quests:**\n` +
                         `┃ \`${prefix}q action\` — View your action quest status`;

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
        if (embed.fields) {
          for (const field of embed.fields) {
            textToCheck += `\n${field.name} ${field.value}`;
          }
        }
      }
    }

    if (!textToCheck) return null;

    const cleanContent = textToCheck.replace(/\s+/g, ' ').trim();

    const singleQuestRegex = /(?:([a-zA-Z]+)\s*Quests?|Quest[:\s]*([a-zA-Z]+))\s*—\s*(\d+\/\d+)\s*total\s*#(\d+)\s*(?:\[(\d+)\])?\s*([^\s]+)\s*(\d{17,20})\s*—\s*(\d+\/\d+)\s*\((\d+)%\)/i;
    const match = cleanContent.match(singleQuestRegex);

    if (match) {
      try {
        const questType = (match[1] || match[2]).toLowerCase();
        const questData = {
          questType,
          globalProgress: match[3],
          rankNumber: match[4],
          bracketId: match[5] || null,
          username: match[6],
          userId: match[7],
          userProgress: match[8],
          percentage: parseInt(match[9], 10),
          timestamp: Date.now()
        };

        const dbKey = `${questData.userId}_${questData.questType}`;
        const allKey = `${questData.userId}_all_quests`;

        localDatabaseMock.set(dbKey, questData);

        let userAllData = localDatabaseMock.get(allKey);
        if (!userAllData) {
          userAllData = { userId: questData.userId, username: questData.username, quests: {} };
        }
        userAllData.quests[questType] = questData;
        localDatabaseMock.set(allKey, userAllData);

        return questData;
      } catch (err) {
        console.error('Error parsing single quest log:', err);
      }
    }

    const multiLineRegex = /(Pray|Curse|Action|Hunt|Battle|Gambling|Slot|Coinflip|Vote|Cookie|OwO)\s*[:\-]?\s*(\d+\/\d+)/gi;
    let multiMatch;
    let foundAny = false;
    const userIdMatch = cleanContent.match(/\b(\d{17,20})\b/) || message.mentions?.users?.first()?.id;
    const usernameMatch = cleanContent.match(/#1\s*(?:\[\d+\])?\s*([^\s]+)/) || message.author?.username;

    while ((multiMatch = multiLineRegex.exec(cleanContent)) !== null) {
      foundAny = true;
      try {
        const questType = multiMatch[1].toLowerCase();
        const progress = multiMatch[2];
        const userId = typeof userIdMatch === 'string' ? userIdMatch : (userIdMatch ? userIdMatch[1] : 'unknown');
        const username = Array.isArray(usernameMatch) ? usernameMatch[1] : usernameMatch;

        const questData = {
          questType,
          userProgress: progress,
          username,
          userId,
          timestamp: Date.now()
        };

        if (userId !== 'unknown') {
          const dbKey = `${userId}_${questType}`;
          const allKey = `${userId}_all_quests`;

          localDatabaseMock.set(dbKey, questData);

          let userAllData = localDatabaseMock.get(allKey);
          if (!userAllData) {
            userAllData = { userId, username, quests: {} };
          }
          userAllData.quests[questType] = questData;
          localDatabaseMock.set(allKey, userAllData);
        }
      } catch (err) {
        console.error('Error parsing overview quest log:', err);
      }
    }

    return foundAny ? true : null;
  }
};
