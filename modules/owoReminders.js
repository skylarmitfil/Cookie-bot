const fs = require('fs');
const path = require('path');

const activeTimers = new Map();
const processedMessages = new Map();
const userEmojiIndices = new Map();

const commandConfig = [
  {
    settingKey: 'Hunt/Battle',
    cooldown: 14000,
    emojis: ['<:hunt_battle:1520116392756772944>', '💀', '⚔️', '🥀', '🩸'],
    label: '**Hunt/Battle**',
    matches: (content, slashName) => {
      if (
        slashName === 'hunt' ||
        slashName === 'battle' ||
        content === 'h' ||
        content === 'b' ||
        content === 'hunt' ||
        content === 'battle' ||
        content === 'wh' ||
        content === 'wb'
      ) {
        return true;
      }
      return /^(owo|uwu|w)\s+(hunt|battle|h|b|wh|wb)$/.test(content) ||
             /^w\s*(h|b|wh|wb)$/.test(content) ||
             /^(wh|wb)$/.test(content);
    }
  },
  {
    settingKey: 'Pray/Curse',
    cooldown: 300000,
    prayEmojis: ['<:Praycurse:1520116373408317570>', '✨', '🙏'],
    curseEmojis: ['🚨', '🤬', '👀'],
    matches: (content, slashName) => {
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
    emojis: ['<:owo:1527608869377933463>', '😺', '💌'],
    label: '**OwO/UwU**',
    matches: (content) => {
      return content === 'owo' || content === 'uwu';
    }
  }
];

function getNextEmoji(userId, cmd, content, slashName) {
  if (cmd.settingKey === 'Pray/Curse') {
    const isCurse = slashName === 'curse' || content.includes('curse');
    const label = isCurse ? '**Curse**' : '**Pray**';
    const emojiList = isCurse ? cmd.curseEmojis : cmd.prayEmojis;
    
    const mapKey = `${userId}-${cmd.settingKey}-${isCurse ? 'curse' : 'pray'}`;
    let currentIndex = userEmojiIndices.get(mapKey) ?? -1;
    currentIndex = (currentIndex + 1) % emojiList.length;
    userEmojiIndices.set(mapKey, currentIndex);
    
    return `${label} ${emojiList[currentIndex]}`;
  }

  const mapKey = `${userId}-${cmd.settingKey}`;
  let currentIndex = userEmojiIndices.get(mapKey) ?? -1;
  currentIndex = (currentIndex + 1) % cmd.emojis.length;
  userEmojiIndices.set(mapKey, currentIndex);
  
  return `${cmd.label} ${cmd.emojis[currentIndex]}`;
}

module.exports = {
  name: 'oworeminders',
  execute: async (message) => {
    if (!message) return;

    const content = (message.content || '').toLowerCase().trim();
    const userId = message.author?.id;
    if (!userId) return;

    if (message.author.bot) return;

    const slashName = message.interactionMetadata?.name?.toLowerCase() || '';

    const matchedCommand = commandConfig.find(cmd => {
      try {
        return cmd.matches(content, slashName);
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
      const { settingKey, cooldown } = matchedCommand;
      const prefsModule = message.client?.modules?.get('c');
      const reminderModule = message.client?.modules?.get('reminder');

      let isEnabled = true;
      let usePing = true;
      let useReply = false;
      let isAutoDelete = false;

      if (prefsModule && typeof prefsModule.getSetting === 'function') {
        const settingRaw = prefsModule.getSetting(userId, settingKey, 'enabled');
        if (settingRaw !== undefined) isEnabled = settingRaw;

        const usePingRaw = prefsModule.getSetting(userId, settingKey, 'ping');
        if (usePingRaw !== undefined) usePing = usePingRaw;

        const useReplyRaw = prefsModule.getSetting(userId, settingKey, 'reply');
        if (useReplyRaw !== undefined) useReply = useReplyRaw;

        const autoDeleteRaw = prefsModule.getSetting(userId, settingKey, 'autoDelete');
        if (autoDeleteRaw !== undefined) isAutoDelete = autoDeleteRaw;
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
          let alertMessage = getNextEmoji(userId, matchedCommand, content, slashName);
          if (reminderModule && reminderModule.userReminderMsgs) {
            const userMsgs = reminderModule.userReminderMsgs.get(userId);
            if (userMsgs && userMsgs[settingKey]) {
              alertMessage = userMsgs[settingKey];
            }
          }

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

          if (sentMessage && typeof sentMessage.delete === 'function' && isAutoDelete) {
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
