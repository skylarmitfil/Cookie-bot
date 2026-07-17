module.exports = {
    name: 'owoReminders',

    execute: async (message, prefix) => {
        const content = message.content.toLowerCase().trim();
        const userId = message.author.id;
        
        const prefsModule = message.client.modules.get('userPreferences');
        if (!prefsModule) return;

        if (content.startsWith(`${prefix}hunt`) || content.startsWith(`${prefix}battle`) || content.startsWith('owo hunt') || content.startsWith('owo h')) {
            try {
                const isEnabled = prefsModule.getSetting(userId, 'Hunt/Battle', 'enabled');
                if (!isEnabled) return;

                const usePing = prefsModule.getSetting(userId, 'Hunt/Battle', 'ping');
                const useReply = prefsModule.getSetting(userId, 'Hunt/Battle', 'reply');

                setTimeout(async () => {
                    const alertMsg = `${usePing ? `<@${userId}>` : `**${message.author.username}**`}, your **Hunt/Battle** cooldown is over! ⚔️`;
                    
                    if (useReply) {
                        await message.reply({ content: alertMsg }).catch(() => {});
                    } else {
                        await message.channel.send({ content: alertMsg }).catch(() => {});
                    }
                }, 16000);

            } catch (err) {
                console.error('[REMINDER ERROR] Hunt calculation failure:', err);
            }
        }

        else if (content.startsWith(`${prefix}pray`) || content.startsWith(`${prefix}curse`) || content.startsWith('owo pray') || content.startsWith('owo p')) {
            try {
                const isEnabled = prefsModule.getSetting(userId, 'Pray/Curse', 'enabled');
                if (!isEnabled) return;

                const usePing = prefsModule.getSetting(userId, 'Pray/Curse', 'ping');
                const useReply = prefsModule.getSetting(userId, 'Pray/Curse', 'reply');

                setTimeout(async () => {
                    const alertMsg = `${usePing ? `<@${userId}>` : `**${message.author.username}**`}, your **Pray/Curse** cooldown is refreshed! 🙏`;
                    
                    if (useReply) {
                        await message.reply({ content: alertMsg }).catch(() => {});
                    } else {
                        await message.channel.send({ content: alertMsg }).catch(() => {});
                    }
                }, 300000);

            } catch (err) {
                console.error('[REMINDER ERROR] Pray calculation failure:', err);
            }
        }

        else if (content === 'owo' || content === 'uwu' || content.startsWith('owo ') || content.startsWith('uwu ')) {
            try {
                const isEnabled = prefsModule.getSetting(userId, 'OwO', 'enabled');
                if (!isEnabled) return;

                const usePing = prefsModule.getSetting(userId, 'OwO', 'ping');
                const useReply = prefsModule.getSetting(userId, 'OwO', 'reply');

                setTimeout(async () => {
                    const alertMsg = `${usePing ? `<@${userId}>` : `**${message.author.username}**`}, your **OwO** ready status is clear! 🦊`;
                    
                    if (useReply) {
                        await message.reply({ content: alertMsg }).catch(() => {});
                    } else {
                        await message.channel.send({ content: alertMsg }).catch(() => {});
                    }
                }, 10000);

            } catch (err) {
                console.error('[REMINDER ERROR] OwO calculation failure:', err);
            }
        }
    }
};
