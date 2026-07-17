module.exports = {
  // We use exactly 'oworeminders' here to ensure your index.js Map matches it perfectly
  name: 'oworeminders',
  execute: async (message, prefix) => {
    // 1. DIAGNOSTIC CONSOLE LOG
    console.log(`[OWOREMINDERS] File executed! Reading: "${message?.content}" from user: ${message?.author?.id}`);

    // Safety guard to prevent crashes from empty/system/bot messages
    if (!message || !message.content || message.author?.bot) return;

    const content = message.content.toLowerCase().trim();
    const userId = message.author.id;
    const cleanPrefix = (prefix || '').toLowerCase();
    
    // 2. Configurations array
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

    // 3. Find which action triggered the reminder
    const matchedCommand = commandConfig.find(cmd => {
      try {
        return cmd.matches();
      } catch {
        return false;
      }
    });
    
    if (!matchedCommand) {
      console.log(`[OWOREMINDERS] Message did not match any tracking regex patterns.`);
      return;
    }

    try {
      const { settingKey, cooldown, emoji } = matchedCommand;
      console.log(`[OWOREMINDERS] Pattern hit on: ${settingKey}`);

      // Safe Defaults
      let isEnabled = true;
      let usePing = true;
      let useReply = false;

      // 4. Ultra-Safe Module Connection Guard
      const prefsModule = message.client?.modules?.get('userPreferences');
      if (prefsModule && typeof prefsModule.getSetting === 'function') {
        const settingRaw = prefsModule.getSetting(userId, settingKey, 'enabled');
        if (settingRaw !== undefined) isEnabled = settingRaw;

        const usePingRaw = prefsModule.getSetting(userId, settingKey, 'ping');
        if (usePingRaw !== undefined) usePing = usePingRaw;

        const useReplyRaw = prefsModule.getSetting(userId, settingKey, 'reply');
        if (useReplyRaw !== undefined) useReply = useReplyRaw;
      } else {
        console.log('[OWOREMINDERS] Warning: userPreferences missing or incompatible. Defaulting to enabled.');
      }

      if (!isEnabled) {
        console.log(`[OWOREMINDERS] User explicitly disabled this reminder. Aborting.`);
        return;
      }

      console.log(`[OWOREMINDERS] Queueing reminder alert for user in ${cooldown}ms.`);

      // 5. Cooldown Execution Timer
      setTimeout(async () => {
        try {
          const username = message.author?.username || 'User';
          const userMention = usePing ? `<@${userId}>` : `**${username}**`;
          const alertMsg = `${userMention}, your **${settingKey}** cooldown is over! ${emoji}`;

          if (useReply) {
            await message.reply({ content: alertMsg }).catch((e) => console.error('[OWOREMINDERS REPLY FAIL]', e));
          } else {
            await message.channel.send({ content: alertMsg }).catch((e) => console.error('[OWOREMINDERS SEND FAIL]', e));
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
