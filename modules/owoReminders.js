module.exports = {
  name: 'oworeminders',
  execute: async (message, prefix) => {
    // SAFETY GUARD: Ignore empty messages, system messages, and standard bots
    if (!message || !message.content || message.author?.bot) return;

    // Official OwO Bot ID is '408785106942115840'. If the message comes from OwO, STOP immediately.
    if (message.author.id === '408785106942115840') return;

    const content = message.content.toLowerCase().trim();
    const userId = message.author.id;
    const cleanPrefix = (prefix || '').toLowerCase();
    
    // 1. Configurations array with customized, distinct notification messages
    const commandConfig = [
      {
        settingKey: 'Hunt/Battle',
        cooldown: 16000,
        emoji: '<:hunt_battle:1520116392756772944>',
        alertTemplate: (mention, emoji) => `**Hunt/Battle** ${emoji}`,
        matches: () =>
          (cleanPrefix && content.startsWith(`${cleanPrefix}hunt`)) ||
          (cleanPrefix && content.startsWith(`${cleanPrefix}battle`)) ||
          /^(owo|uwu)\s+(hunt|h|battle|b)\b/.test(content)
      },
      {
        settingKey: 'Pray/Curse',
        cooldown: 300000,
        emoji: '<:Praycurse:1520116373408317570>',
        alertTemplate: (mention, emoji) => `**Pray/Curse** ${emoji}`,
        matches: () =>
          (cleanPrefix && content.startsWith(`${cleanPrefix}pray`)) ||
          (cleanPrefix && content.startsWith(`${cleanPrefix}curse`)) ||
          /^(owo|uwu)\s+(pray|curse|p|c)\b/.test(content)
      },
      {
        settingKey: 'OwO',
        cooldown: 10000,
        emoji: '<:owo:1527608869377933463>',
        alertTemplate: (mention, emoji) => `**OwO/UwU** ${emoji}`,
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
      const { settingKey, cooldown, emoji, alertTemplate } = matchedCommand;

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

      // 3. Cooldown Execution Timer
      setTimeout(async () => {
        try {
          const username = message.author?.username || 'User';
          const userMention = usePing ? `<@${userId}>` : `**${username}**`;
          
          // Generate the specific custom string text for this category module trigger
          const alertMsg = alertTemplate(userMention, emoji);

          let sentMessage;
          if (useReply) {
            sentMessage = await message.reply({ content: alertMsg }).catch(() => {});
          } else {
            sentMessage = await message.channel.send({ content: alertMsg }).catch(() => {});
          }

          // 4. Auto-Delete Feature
          if (sentMessage && typeof sentMessage.delete === 'function') {
            setTimeout(async () => {
              await sentMessage.delete().catch(() => {});
            }, 5000); // 5 seconds
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

