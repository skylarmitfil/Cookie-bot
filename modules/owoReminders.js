// Global map tracker to catch and clear duplicate active user timers
const activeTimers = new Map();

module.exports = {
  name: 'oworeminders',
  execute: async (message) => {
    if (!message || message.author?.bot) return;
    if (message.author.id === '408785106942115840') return;

    const content = (message.content || '').toLowerCase().trim();
    const userId = message.author.id;
    
    // Normalize by removing all spaces: 'owo h' -> 'owoh', 'w h' -> 'wh'
    const normalized = content.replace(/\s+/g, '');

    const commandConfig = [
      {
        settingKey: 'Hunt/Battle',
        cooldown: 16000,
        emoji: '<:hunt_battle:1520116392756772944>',
        alertTemplate: (userDisplay, emoji) => `${userDisplay} **Hunt/Battle** ${emoji}`,
        // Triggers: owoh, wh, owob, wb, plus the standalone 'h', 'b', 'hunt', 'battle'
        matches: () => ['owoh', 'wh', 'owob', 'wb', 'h', 'b', 'hunt', 'battle'].includes(normalized)
      },
      {
        settingKey: 'Pray/Curse',
        cooldown: 300000,
        emoji: '<:Praycurse:1520116373408317570>',
        alertTemplate: (userDisplay, emoji) => `${userDisplay} **Pray/Curse** ${emoji}`,
        matches: () => ['owopray', 'wpray', 'owocurse', 'wcurse', 'pray', 'curse'].includes(normalized)
      },
      {
        settingKey: 'OwO',
        cooldown: 10000,
        emoji: '<:owo:1527608869377933463>',
        alertTemplate: (userDisplay, emoji) => `${userDisplay} **OwO/UwU** ${emoji}`,
        matches: () => ['owo', 'uwu'].includes(normalized)
      }
    ];

    const matchedCommand = commandConfig.find(cmd => cmd.matches());
    if (!matchedCommand) return;

    try {
      const { settingKey, cooldown, emoji, alertTemplate } = matchedCommand;
      
      // Fetch user settings
      const prefsModule = message.client?.modules?.get('c');
      let isEnabled = true;
      let usePing = true;
      let useReply = false;

      if (prefsModule?.getSetting) {
        isEnabled = prefsModule.getSetting(userId, settingKey, 'enabled') ?? true;
        usePing = prefsModule.getSetting(userId, settingKey, 'ping') ?? true;
        useReply = prefsModule.getSetting(userId, settingKey, 'reply') ?? false;
      }

      if (!isEnabled) return;

      const timerKey = `${userId}-${settingKey}`;
      if (activeTimers.has(timerKey)) {
        clearTimeout(activeTimers.get(timerKey));
      }

      const newTimer = setTimeout(async () => {
        activeTimers.delete(timerKey);
        const userDisplay = usePing ? `<@${userId}>` : `**${message.author.username}**`;
        const alertMsg = alertTemplate(userDisplay, emoji);

        const sentMessage = useReply 
          ? await message.reply({ content: alertMsg, flags: 4096 }).catch(() => {})
          : await message.channel.send({ content: alertMsg, flags: 4096 }).catch(() => {});

        if (sentMessage?.delete) {
          setTimeout(() => sentMessage.delete().catch(() => {}), 5000);
        }
      }, cooldown);

      activeTimers.set(timerKey, newTimer);

    } catch (err) {
      console.error(`[OWOREMINDERS ERROR]:`, err);
    }
  }
};
