const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const DATA_DIR = '/app/data';
const REMINDERS_FILE = path.join(DATA_DIR, 'userReminders.json');

// Map to store user custom reminder messages: userId -> { 'Hunt/Battle': '...', 'Pray/Curse': '...', 'OwO': '...' }
let userReminderMsgs = new Map();

// Storage Initialization
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(REMINDERS_FILE)) {
    const rawData = fs.readFileSync(REMINDERS_FILE, 'utf8');
    if (rawData.trim()) {
      const parsed = JSON.parse(rawData);
      userReminderMsgs = new Map(Object.entries(parsed));
      console.log(`[STORAGE] Successfully loaded ${userReminderMsgs.size} user custom reminder profiles.`);
    }
  }
} catch (error) {
  console.error(`[STORAGE ERROR] Reminders init error: ${error.message}`);
}

function saveRemindersData() {
  try {
    const obj = Object.fromEntries(userReminderMsgs);
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (error) {
    console.error(`[STORAGE ERROR] Reminders save error: ${error.message}`);
  }
}

module.exports = {
  name: 'reminder',
  userReminderMsgs,
  async execute(message, args) {
    try {
      const userId = message.author.id;
      const subCommand = args && args[0] ? args[0].toLowerCase() : null;

      if (subCommand === 'msg' || subCommand === 'message') {
        const categoryArg = args[1] ? args[1].toLowerCase() : null;
        let categoryKey = null;

        if (categoryArg === 'hunt' || categoryArg === 'battle' || categoryArg === 'hb') categoryKey = 'Hunt/Battle';
        if (categoryArg === 'pray' || categoryArg === 'curse' || categoryArg === 'pc') categoryKey = 'Pray/Curse';
        if (categoryArg === 'owo' || categoryArg === 'uwu') categoryKey = 'OwO';

        if (!categoryKey) {
          return message.reply('❌ **Error:** Specify a valid category (`hb`, `pc`, or `owo`) and your custom message.\nExample: `.reminder msg hb Time to hunt!`');
        }

        const customText = args.slice(2).join(' ').trim();
        if (!customText) {
          return message.reply('❌ **Error:** You cannot set an empty reminder message! Provide the text you want to use.');
        }

        if (!userReminderMsgs.has(userId)) {
          userReminderMsgs.set(userId, {});
        }
        const userMsgs = userReminderMsgs.get(userId);
        userMsgs[categoryKey] = customText;
        saveRemindersData();

        return message.reply(`✅ **Success:** Your custom reminder message for **${categoryKey}** has been updated to:\n> ${customText}`);
      }

      if (subCommand === 'reset') {
        const categoryArg = args[1] ? args[1].toLowerCase() : null;
        if (!categoryArg) {
          return message.reply('❌ **Error:** Specify a category to reset (`hb`, `pc`, `owo`, or `all`).');
        }

        let categoryKey = null;
        if (categoryArg === 'hunt' || categoryArg === 'battle' || categoryArg === 'hb') categoryKey = 'Hunt/Battle';
        if (categoryArg === 'pray' || categoryArg === 'curse' || categoryArg === 'pc') categoryKey = 'Pray/Curse';
        if (categoryArg === 'owo' || categoryArg === 'uwu') categoryKey = 'OwO';

        if (categoryArg === 'all') {
          userReminderMsgs.delete(userId);
          saveRemindersData();
          return message.reply('🔄 **Success:** All your custom reminder messages have been reset to default.');
        }

        if (!categoryKey || !userReminderMsgs.has(userId)) {
          return message.reply('❌ **Error:** Invalid category or no custom messages found to reset.');
        }

        const userMsgs = userReminderMsgs.get(userId);
        delete userMsgs[categoryKey];
        saveRemindersData();

        return message.reply(`🔄 **Success:** Your custom reminder message for **${categoryKey}** has been reset to default.`);
      }

      // Default info embed if no valid subcommand given
      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle(`⏰ ${message.author.username}'s Custom Reminders`)
        .setDescription(
          'Customize your personal OwO reminder alert messages using text prefixes!\n\n' +
          '**Commands:**\n' +
          '• `.reminder msg hb <text>` — Set custom text for Hunt/Battle\n' +
          '• `.reminder msg pc <text>` — Set custom text for Pray/Curse\n' +
          '• `.reminder msg owo <text>` — Set custom text for OwO\n' +
          '• `.reminder reset <hb/pc/owo/all>` — Reset to default messages'
        );

      const userMsgs = userReminderMsgs.get(userId) || {};
      embed.addFields(
        { name: 'Hunt/Battle Custom Text', value: userMsgs['Hunt/Battle'] || '*Default*', inline: false },
        { name: 'Pray/Curse Custom Text', value: userMsgs['Pray/Curse'] || '*Default*', inline: false },
        { name: 'OwO Custom Text', value: userMsgs['OwO'] || '*Default*', inline: false }
      );

      return message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('[REMINDER COMMAND ERROR]:', error);
    }
  }
};
