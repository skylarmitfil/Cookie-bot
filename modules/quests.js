const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

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
      content === '.quest' ||
      content === 'q' ||
      content === 'quest' ||
      /^[!#./\\?]\s*(q|quest)$/.test(content);

    if (!isQuestCommand) return;

    try {
      const prefix = '.'; 

      const contents = {
        all_quests: '',
        pray_quests: '',
        curse_quests: '',
        action_quests: ''
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

      if (message.channel && typeof message.channel.send === 'function') {
        await message.channel.send(buildV2Payload('all_quests', false));
      }
    } catch (error) {
      console.error('Error executing quests command:', error);
    }
  }
};
