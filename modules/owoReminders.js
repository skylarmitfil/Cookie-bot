module.exports = {
  name: 'oworeminders',
  execute: async (message, prefix) => {
    // SAFETY GUARD: Ignore empty messages, system messages, and standard bots
    if (!message || !message.content || message.author?.bot) return;

    // --- ADD THIS CRITICAL FIX LINE HERE ---
    // Official OwO Bot ID is '408785106942115840'. If the message comes from OwO, STOP immediately.
    if (message.author.id === '408785106942115840') return;

    const content = message.content.toLowerCase().trim();
    const userId = message.author.id;
    const cleanPrefix = (prefix || '').toLowerCase();
    
    // Configurations array
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

    // Find which action triggered the reminder
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

      // User setting validation check + Safe Fallback to true if profile doesn't exist
      const prefsModule = message.client?.modules?.get('userPreferences');
      let isEnabled = true;
      let usePing = true;
      let useReply = false;

      if (prefsModule && typeof prefsModule.getSetting === 'function') {
        const settingRaw = prefsModule.getSetting(userId, settingKey, 'enabled');
        if (settingRaw !== undefined) isEnabled = settingRaw;

        const usePingRaw = prefsModule.getSetting(userId, settingKey, 'ping');
        if (usePingRaw !== undefined) usePing = usePingRaw;

        const useReplyRaw = prefsModule.getSetting(userId, settingKey, 'reply');
        if (useReplyRaw !== undefined) useReply = useReplyRaw;
      }

      if (!isEnabled) return;

      // Cooldown Execution Timer
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
          console.error('[OWOREMINDERS TIMEOUT RUNTIME ERROR]:', timeoutErr);
        }
      }, cooldown);

    } catch (err) {
      console.error(`[OWOREMINDERS SYSTEM FAILURE]:`, err);
    }
  }
};

