// Global map tracker to catch and clear duplicate active user timers
const activeTimers = new Map();

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
    
    // 1. Configurations array with your exact requested short notification styles
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

      // --- CRITICAL OVERPING FIX MECHANISM ---
      // Build a unique tracking identifier string for this user and cooldown combination
      const timerKey = `${userId}-${settingKey}`;

      // Check if a timer already exists for this action. If it does, clear it immediately.
      if (activeTimers.has(timerKey)) {
        clearTimeout(activeTimers.get(timerKey));
        activeTimers.delete(timerKey);
      }

      // 3. Cooldown Execution Timer
      const newTimer = setTimeout(async () => {
        try {
          // Clean up the tracking key from cache memory once the timer completes execution
          activeTimers.delete(timerKey);

          const username = message.author?.username || 'User';
          const userMention = usePing ? `<@${userId}>` : `**${username}**`;
          
          // Generate your short custom message string
          const alertMsg = alertTemplate(userMention, emoji);

          // Payload includes flag: 4096 (MessageFlags.Silent) to slide in silently
          const messageOptions = { 
            content: alertMsg,
            flags: 4096 
          };

          let sentMessage;
          if (useReply) {
            sentMessage = await message.reply(messageOptions).catch(() => {});
          } else {
            sentMessage = await message.channel.send(messageOptions).catch(() => {});
          }

          // 4. Auto-Delete Feature (5 seconds)
          if (sentMessage && typeof sentMessage.delete === 'function') {
            setTimeout(async () => {
              await sentMessage.delete().catch(() => {});
            }, 5000); 
          }

        } catch (timeoutErr) {
          console.error('[OWOREMINDERS TIMEOUT RUNTIME ERROR]:', timeoutErr);
        }
      }, cooldown);

      // Save the freshly created timer reference ID to our active tracks tracking array
      activeTimers.set(timerKey, newTimer);

    } catch (err) {
      console.error(`[OWOREMINDERS SYSTEM FAILURE]:`, err);
    }
  }
};
