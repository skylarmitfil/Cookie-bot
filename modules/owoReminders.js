// Global map tracker to catch and clear duplicate active user timers
const activeTimers = new Map();

module.exports = {
  name: 'oworeminders',
  execute: async (message) => {
    // SAFETY GUARD: Ignore empty messages, system messages, and standard bots
    if (!message || message.author?.bot) return;

    // Official OwO Bot ID is '408785106942115840'. If the message comes from OwO, STOP immediately.
    if (message.author.id === '408785106942115840') return;

    const content = (message.content || '').toLowerCase().trim();
    const userId = message.author.id;

    // Extract interaction metadata if the user typed an official Discord Slash Command
    const slashName = message.interactionMetadata?.name?.toLowerCase() || '';

    // 1. Configurations array with strict full-string exact matching
    const commandConfig = [
      {
        settingKey: 'Hunt/Battle',
        cooldown: 16000,
        emoji: '<:hunt_battle:1520116392756772944>',
        // FIXED: The message text now contains exactly the text and emoji without any user details
        alertTemplate: (emoji) => `**Hunt/Battle** ${emoji}`,
        matches: () => 
          slashName === 'hunt' || 
          slashName === 'battle' || 
          content === 'h' || 
          content === 'b' ||
          content === 'hunt' ||
          content === 'battle' ||
          /^(owo|uwu|w)\s+(hunt|battle|h|b)$/.test(content)
      },
      {
        settingKey: 'Pray/Curse',
        cooldown: 300000,
        emoji: '<:Praycurse:1520116373408317570>',
        // FIXED: Clean text layout
        alertTemplate: (emoji) => `**Pray/Curse** ${emoji}`,
        matches: () => 
          slashName === 'pray' || 
          slashName === 'curse' || 
          content === 'pray' || 
          content === 'curse' ||
          /^(owo|uwu|w)\s+(pray|curse)$/.test(content)
      },
      {
        settingKey: 'OwO',
        cooldown: 10000,
        emoji: '<:owo:1527608869377933463>',
        // FIXED: Clean text layout
        alertTemplate: (emoji) => `**OwO/UwU** ${emoji}`,
        matches: () => content === 'owo' || content === 'uwu'
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

      // Exit early if the user turned off this specific category toggle
      if (!isEnabled) return;

      // If both ping AND reply options are disabled by the user, ignore the tracker entirely.
      if (!usePing && !useReply) return;

      // --- CRITICAL OVERPING FIX MECHANISM ---
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

          // Generate your clean custom message string using the template parameter
          const alertMsg = alertTemplate(emoji);

          // Payload includes flag: 4096 (MessageFlags.Silent) to slide in silently
          const messageOptions = { 
            content: alertMsg, 
            flags: 4096,
            allowedMentions: {
              // Parse user pings only if usePing is true
              parse: usePing ? ['users'] : [],
              // Native reply line will ping if usePing is allowed, otherwise it stays quiet
              repliedUser: usePing
            }
          };

          let sentMessage;
          if (useReply) {
            sentMessage = await message.reply(messageOptions).catch(() => {});
          } else {
            // FIXED: If they have reply turned OFF but ping turned ON, they want a standard message.
            // Since the text itself has no user tag, we must prepend the text ping to the channel message.
            if (usePing) {
              messageOptions.content = `<@${userId}> ${alertMsg}`;
            }
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
