module.exports = {
  name: 'owoReminders',
  execute: async (message, prefix) => {
    // Safety guard to prevent crashes from empty/system/bot messages
    if (!message || !message.content || message.author?.bot) return;

    const content = message.content.toLowerCase().trim();
    const userId = message.author.id;
    const cleanPrefix = (prefix || '').toLowerCase();
    
    const prefsModule = message.client?.modules?.get('userPreferences');
    if (!prefsModule) return;

    // 1. Define configurations with verified match patterns
    const commandConfig = [
      {
        settingKey: 'Hunt/Battle',
        cooldown: 16000,
        emoji: '<:hunt_battle:1520116392756772944>', 
        matches: () =>
          (cleanPrefix && content.startsWith(`${cleanPrefix}hunt`)) ||
          (cleanPrefix && content.startsWith(`${cleanPrefix}battle`)) ||
          /^(owo|uwu)\s+(hunt|h|battle|b)\b/.test(content)
      },
      {
        settingKey: 'Pray/Curse',
        cooldown: 300000,
        emoji: '<:Praycurse:1520116373408317570>', 
        matches: () =>
          (cleanPrefix && content.startsWith(`${cleanPrefix}pray`)) ||
          (cleanPrefix && content.startsWith(`${cleanPrefix}curse`)) ||
          /^(owo|uwu)\s+(pray|curse|p|c)\b/.test(content)
      },
      {
        settingKey: 'OwO',
        cooldown: 10000,
        emoji: '<:owo:1527608869377933463>', 
        matches: () => /^(owo|uwu)(\s|$)/.test(content)
      }
    ];

    // 2. Find which action triggered the reminder
    const matchedCommand = commandConfig.find(cmd => {
      try {
        return cmd.matches();
      } catch {
        return false;
      }
    });
    
    if (!matchedCommand) return;

    try {
      const { settingKey, cooldown, emoji } = matchedCommand;

      // 3. User setting validation check
      const isEnabled = prefsModule.getSetting(userId, settingKey, 'enabled');
      if (!isEnabled) return;

      const usePing = prefsModule.getSetting(userId, settingKey, 'ping');
      const useReply = prefsModule.getSetting(userId, settingKey, 'reply');

      // 4. Single execution reminder timer
      setTimeout(async () => {
        try {
          const username = message.author?.username || 'User';
          const userMention = usePing ? `<@${userId}>` : `**${username}**`;
          const alertMsg = `${userMention}, your **${settingKey}** cooldown is over! ${emoji}`;

          if (useReply) {
            await message.reply({ content: alertMsg }).catch(() => {});
          } else {
            await message.channel.send({ content: alertMsg }).catch(() => {});
          }
        } catch (timeoutErr) {
          console.error('[REMINDER TIMEOUT ERROR]:', timeoutErr);
        }
      }, cooldown);

    } catch (err) {
      console.error(`[REMINDER ERROR] ${matchedCommand.settingKey} system failure:`, err);
    }
  }
};
