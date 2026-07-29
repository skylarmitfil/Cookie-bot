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
        // Bottom part completely removed / simplified as requested
        allText += `**All Quests:**\n┃ No active quests tracked yet.`;
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

    // Fix: OwO embeds don't always tag or set message.author to the user.
    // We parse user IDs from mentions, interaction metadata, or footer fields.
    let userId = message.author && !message.author.bot ? message.author.id : null;

    if (!userId && message.interaction && message.interaction.user) {
      userId = message.interaction.user.id;
    }

    if (!userId && message.mentions?.users?.first()) {
      userId = message.mentions.users.first().id;
    }

    if (!userId) {
      const matchId = cleanContent.match(/\b(\d{17,20})\b/);
      if (matchId) userId = matchId[1];
    }

    if (!userId) return null;

    const username = message.author?.username || 'user';
    const allKey = `${userId}_all_quests`;
    let userAllData = localDatabaseMock.get(allKey);
    if (!userAllData) {
      userAllData = { userId, username, quests: {} };
    }

    let updated = false;

    // Expanded matching to catch OwO quest text variations accurately
    if (lowerContent.includes('pray') || lowerContent.includes('🙏')) {
      userAllData.quests['pray'] = { questType: 'pray', timestamp: Date.now() };
      localDatabaseMock.set(`${userId}_pray`, userAllData.quests['pray']);
      updated = true;
    }

    if (lowerContent.includes('curse') || lowerContent.includes('👻')) {
      userAllData.quests['curse'] = { questType: 'curse', timestamp: Date.now() };
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
      userAllData.quests['action'] = { questType: 'action', timestamp: Date.now() };
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
