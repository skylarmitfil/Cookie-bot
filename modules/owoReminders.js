const activeTimers = new Map();
const processedMessages = new Map();

module.exports = {
  name: 'oworeminders',
  execute: async (message) => {
    if (!message) return;

    const content = (message.content || '').toLowerCase().trim();
    const userId = message.author?.id;
    if (!userId) return;

    if (message.author.bot) return;

    const slashName = message.interactionMetadata?.name?.toLowerCase() || '';

    const commandConfig = [
      {
        settingKey: 'Hunt/Battle',
        cooldown: 16000,
        emoji: '<:hunt_battle:1520116392756772944>',
        alertTemplate: (emoji) => `**Hunt/Battle** ${emoji}`,
        matches: () => {
          if (
            slashName === 'hunt' ||
            slashName === 'battle' ||
            content === 'h' ||
            content === 'b' ||
            content === 'hunt' ||
            content === 'battle'
          ) {
            return true;
          }
          return /^(owo|uwu|w)\s+(hunt|battle|h|b)$/.test(content) ||
                 /^w\s*h$/.test(content) ||
                 /^w\s*b$/.test(content) ||
                 /^wh$/.test(content) ||
                 /^wb$/.test(content);
        }
      },
      {
        settingKey: 'Pray/Curse',
        cooldown: 300000,
        emoji: '<:Praycurse:1520116373408317570>',
        alertTemplate: (emoji) => `**Pray/Curse** ${emoji}`,
        matches: () => {
          return (
            slashName === 'pray' ||
            slashName === 'curse' ||
            content === 'pray' ||
            content === 'curse' ||
            /^(owo|uwu|w)\s+(pray|curse)$/.test(content)
          );
        }
      },
      {
        settingKey: 'OwO',
        cooldown: 10000,
        emoji: '<:owo:1527608869377933463>',
        alertTemplate: (emoji) => `**OwO/UwU** ${emoji}`,
        matches: () => {
          return content === 'owo' || content === 'uwu';
        }
      }
    ];

    const matchedCommand = commandConfig.find(cmd => {
      try {
        return cmd.matches();
      } catch {
        return false;
      }
    });

    if (!matchedCommand) return;

    const messageKey = `${userId}-${message.id}`;
    if (processedMessages.has(messageKey)) return;
    processedMessages.set(messageKey, true);
    
    setTimeout(() => processedMessages.delete(messageKey), 30000);

    try {
      const { settingKey, cooldown, emoji, alertTemplate } = matchedCommand;
      const prefsModule = message.client?.modules?.get('c');

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

      const isPureSilent = !usePing && !useReply;
      if (isPureSilent) return;

      const timerKey = `${userId}-${settingKey}`;

      if (activeTimers.has(timerKey)) {
        clearTimeout(activeTimers.get(timerKey));
        activeTimers.delete(timerKey);
      }

      const newTimer = setTimeout(async () => {
        try {
          const alertMessage = alertTemplate(emoji);
          const user = await message.client.users.fetch(userId);
          if (!user) return;

          let reminderText = alertMessage;

          if (usePing) {
            reminderText = `${user.toString()}, ${alertMessage}`;
          }

          let sentMessage = null;

          if (useReply && message.channel && typeof message.channel.send === 'function') {
            sentMessage = await message.reply(reminderText);
          } else if (message.channel && typeof message.channel.send === 'function') {
            sentMessage = await message.channel.send(reminderText);
          }

          if (sentMessage && typeof sentMessage.delete === 'function') {
            setTimeout(async () => {
              try {
                await sentMessage.delete();
              } catch (deleteErr) {
                if (deleteErr.code !== 10008) {
                  console.error('Failed to auto-delete reminder:', deleteErr);
                }
              }
            }, 5000);
          }
        } catch (err) {
          console.error('Error sending OwO reminder:', err);
        } finally {
          activeTimers.delete(timerKey);
        }
      }, cooldown);

      activeTimers.set(timerKey, newTimer);

    } catch (error) {
      console.error('OwO reminder execution error:', error);
    }
  }
};
