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
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('Quests')
        .setDescription('Select a category from the menu below to view specific quest details.')
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('quest_menu_v2')
          .setPlaceholder('Make a selection')
          .addOptions([
            {
              label: 'All quests list',
              value: 'all_quests',
              emoji: '📜',
              default: true,
            },
            {
              label: 'Pray Quests',
              value: 'pray_quests',
              emoji: '🙏',
            },
            {
              label: 'Curse Quests',
              value: 'curse_quests',
              emoji: '👻',
            },
            {
              label: 'Action Quests',
              value: 'action_quests',
              emoji: '🎭',
            },
          ])
      );

      if (message.channel && typeof message.channel.send === 'function') {
        await message.channel.send({ embeds: [embed], components: [row] });
      }
    } catch (error) {
      console.error('Error executing quests command:', error);
    }
  }
};
