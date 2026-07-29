const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Optional local database placeholder. 
// Replace this with your actual database setup (MongoDB, Quick.db, etc.)
const localDatabaseMock = new Map(); 

module.exports = {
  name: 'q',
  description: 'Displays quest information and tracking help.',
  
  /**
   * Command executor triggered when a user explicitly runs your command
   */
  execute: async (message) => {
    if (!message) return;

    const content = (message.content || '').toLowerCase().trim();
    const slashName = message.interactionMetadata?.name?.toLowerCase() || '';

    // Regex checking for owo q, owo quest, w q, wq, and w quest
    const owoQuestRegex = /^(owo\s+q|owo\s+quest|w\s+q|wq|w\s+quest)$/;

    const isQuestCommand = 
      slashName === 'q' ||
      slashName === 'quest' ||
      content === '.q' ||
      content === '.quest' ||
      content === 'q' ||
      content === 'quest' ||
      /^[!#./\\?]\s*(q|quest)$/.test(content) ||
      owoQuestRegex.test(content); 

    if (!isQuestCommand) return;

    try {
      const prefix = '.'; 

      const allText = `### Quests\n\n` +
                      `**All Quests:**\n` +
                      `┃ \`${prefix}q all\` — View all available quests and progress`;

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
              type: 17, // Container Component
              accent_color: 14430780, 
              components: [
                {
                  type: 1, // ActionRow (Menu placed first)
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
                  type: 14 // Separator Component
                },
                {
                  type: 10, // TextDisplay
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

  /**
   * Background parser that checks every message in your messageCreate event handler.
   * Drop this call inside your main event file or index.js setup:
   * e.g., commandFile.handleIncomingQuests(message);
   */
  handleIncomingQuests: async (message) => {
    if (!message || !message.content) return null;

    // Normalizes multiple sequential spacing blocks into single spaces
    const cleanContent = message.content.replace(/\s+/g, ' ').trim();

    // Regular expression matching your custom log data structure
    const questParserRegex = /(Pray|Curse|Action)\s*Quests\s*—\s*(\d+\/\d+)\s*total\s*#1\s*(?:\[(\d+)\])?\s*([^\s]+)\s*(\d{17,20})\s*—\s*(\d+\/\d+)\s*\((\d+)%\)/i;

    const match = cleanContent.match(questParserRegex);
    if (!match) return null; // Exit quietly if the layout doesn't represent a quest data stream

    try {
      const questData = {
        questType: match[1].toLowerCase(),       // 'pray', 'curse', or 'action'
        globalProgress: match[2],                // Overall total progress string (e.g., '2/8')
        bracketId: match[3] || null,             // The bracket counter/ID value (e.g., '522') if available
        username: match[4],                      // The user's platform string username (e.g., 'killer_x_spy')
        userId: match[5],                        // The specific Discord User snowflake ID (e.g., '557461780742406144')
        userProgress: match[6],                  // Specific player completion ratio (e.g., '2/8')
        percentage: parseInt(match[7], 10),      // Raw percentage number safely parsed to base-10 integer
        timestamp: Date.now()                    // Event capture confirmation tracking stamp
      };

      // --- SAVE BLOCK ---
      // Replace this specific map line below with your active database driver update rule:
      // Examples: await db.set(`quest_${questData.userId}`, questData);
      //           await schema.findOneAndUpdate({ userId: questData.userId }, questData, { upsert: true });
      const dbKey = `${questData.userId}_${questData.questType}`;
      localDatabaseMock.set(dbKey, questData);

      console.log(`[Quest Tracker] Saved update for ${questData.username} (${questData.questType}):`, questData);
      return questData;

    } catch (err) {
      console.error('Error occurred while tracking background quest log transmission payload data:', err);
      return null;
    }
  }
};
