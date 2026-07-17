module.exports = {
  name: 'owoReminders',
  execute: async (message, prefix) => {
    const content = message.content.toLowerCase().trim();
    const userId = message.author.id;
    const prefsModule = message.client.modules.get('userPreferences');

    if (!prefsModule) return;

    // 1. Define configurations with your custom emoji formats
    const commandConfig = [
      {
        settingKey: 'Hunt/Battle',
        cooldown: 16000,
        emoji: '<:hunt_battle:1520116392756772944>', // <-- Replace with your custom emoji format
        matches: () =>
          content.startsWith(`${prefix}hunt`) ||
          content.startsWith(`${prefix}battle`) ||
          /^(owo|uwu)\s+(hunt|h|battle|b)\b/.test(content)
      },
      {
        settingKey: 'Pray/Curse',
        cooldown: 300000,
        emoji: '<:Praycurse:1520116373408317570>', // <-- Replace with your custom emoji format
        matches: () =>
          content.startsWith(`${prefix}pray`) ||
          content.startsWith(`${prefix}curse`) ||
          /^(owo|uwu)\s+(pray|curse|p|c)\b/.test(content)
      },
      {
        settingKey: 'OwO',
        cooldown: 10000,
        emoji: '<:owo:1527608869377933463>', // <-- Replace with your custom emoji format
        matches: () => /^(owo|uwu)(\s|$)/.test(content)
      }
    ];

    // 2. Find which action triggered the reminder
    const matchedCommand = commandConfig.find(cmd => cmd.matches());
    if (!matchedCommand) return;

    try {
      const { settingKey, cooldown, emoji } = matchedCommand;

      // 3. Early exit if the user turned off this specific reminder
      if (!prefsModule.getSetting(userId, settingKey, 'enabled')) return;

      const usePing = prefsModule.getSetting(userId, settingKey, 'ping');
      const useReply = prefsModule.getSetting(userId, settingKey, 'reply');

      // 4. Single reusable timer logic
      setTimeout(async () => {
        const userMention = usePing ? `<@${userId}>` : `**${message.author.username}**`;
        const alertMsg = `${userMention}, your **${settingKey}** cooldown is over! ${emoji}`;

        const payload = { content: alertMsg };

        if (useReply) {
          await message.reply(payload).catch(() => {});
        } else {
          await message.channel.send(payload).catch(() => {});
        }
      }, cooldown);

    } catch (err) {
      console.error(`[REMINDER ERROR] ${matchedCommand.settingKey} system failure:`, err);
    }
  }
};
