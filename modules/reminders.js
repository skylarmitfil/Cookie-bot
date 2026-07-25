const fs = require('fs');
const path = require('path');
const { SlashCommandBuilder } = require('discord.js');

const FILE_PATH = path.join('/app/data', 'userReminderMessages.json');
let reminderCache = new Map();

try {
  if (fs.existsSync(FILE_PATH)) {
    const raw = fs.readFileSync(FILE_PATH, 'utf8');
    if (raw.trim()) reminderCache = new Map(Object.entries(JSON.parse(raw)));
  }
} catch (e) {
  console.error('[STORAGE] Cache load error:', e.message);
}

function persistData() {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(Object.fromEntries(reminderCache), null, 2));
  } catch (e) {
    console.error('[STORAGE] Cache save error:', e.message);
  }
}

module.exports = {
  name: 'reminder',
  userReminderMsgs: reminderCache,
  data: new SlashCommandBuilder()
    .setName('reminder')
    .setDescription('Configure your reminder settings')
    .addSubcommand(sub =>
      sub.setName('msg')
        .setDescription('Set or reset reminder text')
        .addStringOption(opt =>
          opt.setName('which')
            .setDescription('Select target tracker')
            .setRequired(true)
            .addChoices(
              { name: 'Hunt/Battle', value: 'Hunt/Battle' },
              { name: 'Pray/Curse', value: 'Pray/Curse' },
              { name: 'OwO', value: 'OwO' },
              { name: 'Reset Hunt/Battle', value: 'clear_hb' },
              { name: 'Reset Pray/Curse', value: 'clear_pc' },
              { name: 'Reset OwO', value: 'clear_owo' }
            )
        )
        .addStringOption(opt =>
          opt.setName('new')
            .setDescription('New alert message text')
            .setRequired(false)
        )
    ),

  async executeSlash(interaction) {
    const uid = interaction.user.id;
    const category = interaction.options.getString('which');
    const msgText = interaction.options.getString('new');

    if (category.startsWith('clear_')) {
      const target = category === 'clear_pc' ? 'Pray/Curse' : category === 'clear_owo' ? 'OwO' : 'Hunt/Battle';
      if (reminderCache.has(uid)) {
        delete reminderCache.get(uid)[target];
        persistData();
      }
      return interaction.reply({ content: `🔄 Reset **${target}** to default.`, ephemeral: true });
    }

    if (!msgText) {
      return interaction.reply({ content: '❌ Provide text for the `new` field or select a reset choice.', ephemeral: true });
    }

    if (!reminderCache.has(uid)) reminderCache.set(uid, {});
    reminderCache.get(uid)[category] = msgText;
    persistData();

    return interaction.reply({ content: `✅ Updated **${category}** to:\n> ${msgText}`, ephemeral: true });
  }
};

