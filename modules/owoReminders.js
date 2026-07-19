// Global map tracker to catch and clear duplicate active user timers
const activeTimers = new Map();

module.exports = {
  name: 'oworeminders',
  execute: async (message) => {
    // SAFETY GUARD: Ignore empty messages, system messages, and standard bots
    if (!message || message.author?.bot) return;

    // Official OwO Bot ID is '408785106942115840'. If the message comes from OwO, STOP immediately.
    if (message.author.id === '408785106942115840') return;

    // Split text into words to check exact standalone terms
    const rawContent = (message.content || '').toLowerCase().trim();
    const words = rawContent.split(/\s+/); 
    const firstWord = words[0] || '';
    const secondWord = words[1] || '';

    const userId = message.author.id;
    const slashName = message.interactionMetadata?.name?.toLowerCase() || '';

    let matchedKey = null;
    let cooldown = 16000;
    let emoji = '';
    let alertText = '';

    // 1. STRICT EQUALITY CHECKING LOGIC
    // Check Hunt / Battle
    if (
      slashName === 'hunt' || 
      slashName === 'battle' || 
      rawContent === 'h' || 
      rawContent === 'b' || 
      rawContent === 'hunt' || 
      rawContent === 'battle' ||
      ((firstWord === 'owo' || firstWord === 'uwu' || firstWord === 'w') && (secondWord === 'hunt' || secondWord === 'battle' || secondWord === 'h' || secondWord === 'b') && words.length === 2)
    ) {
      matchedKey = 'Hunt/Battle';
      cooldown = 16000;
      emoji = '<:hunt_battle:1520116392756772944>';
      alertText = `**Hunt/Battle**`;
    } 
    // Check Pray / Curse
    else if (
      slashName === 'pray' || 
      slashName === 'curse' || 
      rawContent === 'pray' || 
      rawContent === 'curse' ||
      ((firstWord === 'owo' || firstWord === 'uwu' || firstWord === 'w') && (secondWord === 'pray' || secondWord === 'curse') && words.length === 2)
    ) {
      matchedKey = 'Pray/Curse';
      cooldown = 300000;
      emoji = '<:Praycurse:1520116373408317570>';
      alertText = `**Pray/Curse**`;
    } 
    // Check OwO / UwU Social Command (STRICT SINGLE WORD MATCH ONLY)
    else if (rawContent === 'owo' || rawContent === 'uwu') {
      matchedKey = 'OwO';
      cooldown = 10000;
      emoji = '<:owo:1527608869377933463>';
      alertText = `**OwO/UwU**`;
    }

    // Stop if no commands were matched
    if (!matchedKey) return;

    try {
      const prefsModule = message.client?.modules?.get('c');
      
      // Keep defaults as TRUE so reminders never fail by default
      let isEnabled = true;
      let usePing = true;
      let useReply = false;

      if (prefsModule && typeof prefsModule.getSetting === 'function') {
        const settingRaw = prefsModule.getSetting(userId, matchedKey, 'enabled');
        if (settingRaw !== undefined) isEnabled = settingRaw;

        const usePingRaw = prefsModule.getSetting(userId, matchedKey, 'ping');
        if (usePingRaw !== undefined) usePing = usePingRaw;

        const useReplyRaw = prefsModule.getSetting(userId, matchedKey, 'reply');
        if (useReplyRaw !== undefined) useReply = useReplyRaw;
      }

      // If user completely turned off this category, stop here
      if (!isEnabled) return;

      // --- OVERPING FIX MECHANISM ---
      const timerKey = `${userId}-${matchedKey}`;
      if (activeTimers.has(timerKey)) {
        clearTimeout(activeTimers.get(timerKey));
        activeTimers.delete(timerKey);
      }

      // 2. Cooldown Timer Execution
      const newTimer = setTimeout(async () => {
        try {
          activeTimers.delete(timerKey);

          // Base alert content layout
          let alertMsg = `${alertText} ${emoji}`;
          
          const messageOptions = { 
            content: alertMsg, 
            flags: 4096, // Silent flag
            allowedMentions: {
              parse: usePing ? ['users'] : [],
              repliedUser: usePing
            }
          };

          let sentMessage;

          // Process the layout constraints based on settings combination
          if (useReply) {
            // Option: Reply ON. Text string has NO embedded mention tags.
            sentMessage = await message.reply(messageOptions).catch(() => {});
          } else {
            // Option: Reply OFF.
            if (usePing) {
              // Prepend user mention to channel message if text pings are allowed
              messageOptions.content = `<@${userId}> ${alertMsg}`;
              sentMessage = await message.channel.send(messageOptions).catch(() => {});
            } else {
              // If both ping and reply are false, print a safe text identifier
              const username = message.author?.username || 'User';
              messageOptions.content = `**${username}** | ${alertMsg}`;
              sentMessage = await message.channel.send(messageOptions).catch(() => {});
            }
          }

          // 3. Auto-Delete Configuration (5 seconds)
          if (sentMessage && typeof sentMessage.delete === 'function') {
            setTimeout(async () => {
              await sentMessage.delete().catch(() => {});
            }, 5000);
          }
        } catch (timeoutErr) {
          console.error('[OWOREMINDERS TIMEOUT RUNTIME ERROR]:', timeoutErr);
        }
      }, cooldown);

      activeTimers.set(timerKey, newTimer);

    } catch (err) {
      console.error(`[OWOREMINDERS SYSTEM FAILURE]:`, err);
    }
  }
};
