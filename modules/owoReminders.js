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

    // 1. Configurations array with strict, fully-anchored, exact word combinations
    const commandConfig = [
      {
        settingKey: 'Hunt/Battle',
        cooldown: 16000,
        emoji: '<:hunt_battle:1520116392756772944>',
        alertTemplate: (emoji) => `**Hunt/Battle** ${emoji}`,
        matches: () => 
          slashName === 'hunt' || 
          slashName === 'battle' || 
          content === 'h' || 
          content === 'b' ||
          content === 'hunt' ||
          content === 'battle' ||
          // ^ means start of message, $ means end of message. \s+ requires a space between words.
          // This prevents accidental matches like "owob" or "owo hunt chat"
          /^(owo|uwu|w)\s+(hunt|battle|h|b)$/.test(content)
      },
      {
        settingKey: 'Pray/Curse',
        cooldown: 300000,
        emoji: '<:Praycurse:1520116373408317570>',
        alertTemplate: (emoji) => `**Pray/Curse** ${emoji}`,
        matches: () => 
          slashName === 'pray' || 
          slashName === 'curse' || 
          content === 'pray' || 
          content === 'curse' ||
          // Strictly matches "owo pray", "uwu curse", "w pray" with nothing else attached
          /^(owo|uwu|w)\s+(pray|curse)$/.test(content)
      },
      {
        settingKey: 'OwO',
        cooldown: 10000,
        emoji: '<:owo:1527608869377933463>',
        alertTemplate: (emoji) => `**OwO/UwU** ${emoji}`,
        // Strict equality check: Only fires if the message is literally just "owo" or "uwu"
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
      
      // Default configurations to safe fallbacks
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

      // Exit early if the user explicitly turned off this specific category toggle
      if (!isEnabled) return;

      // Determine formatting states based on preference flags
      const isPureSilent = !usePing && !useReply;

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

          // Setup base message choices with 4096 Silent Flag
          const messageOptions = { 
            content: alertMsg, 
            flags: 4096,
            allowedMentions: {
              parse: usePing ? ['users'] : [],
              repliedUser: usePing
            }
          };

          let sentMessage;
          
          if (useReply && !isPureSilent) {
            // Option 1: Reply is ON (Pings depending on usePing)
            sentMessage = await message.reply(messageOptions).catch(() => {});
          } else {
            // Option 2: Reply is OFF
            if (usePing) {
              // Prepend the user mention tag directly to the channel message string
              messageOptions.content = `<@${userId}> ${alertMsg}`;
            } else if (isPureSilent) {
              // Safe Mode: If they turned off both ping and reply, prepend their un-highlighted name
              const username = message.author?.username || 'User';
              messageOptions.content = `**${username}** | ${alertMsg}`;
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
