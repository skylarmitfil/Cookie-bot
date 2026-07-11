const userPrefs = require('./userPreferences');

const REMINDERS = {
    'Hunt/Battle': {
        cooldown: 14 * 1000,
        message: 'Hunt/Battle <:hunt_battle:1520116392756772944>',
        triggers: [
            'owo hunt', 'owohunt', 'owoh', 'owo h', 'wh', 'w h', 
            'owo battle', 'owobattle', 'owob', 'owo b', 'wb', 'w b'
        ]
    },
    'OwO': {
        cooldown: 8 * 1000,
        message: 'owo/uwu',
        triggers: ['owo', 'uwu']
    },
    'Pray/Curse': {
        cooldown: 299 * 1000,
        message: 'Pray/Curse <:Praycurse:1520116373408317570>',
        triggers: ['owo pray', 'w pray', 'wpray', 'owopray', 'owo curse', 'w curse', 'wcurse', 'owocurse']
    }
};

const userTimers = new Map();

function scheduleReminder(userId, messageCtx, reminderKey) {
    const config = REMINDERS[reminderKey];
    
    if (!userTimers.has(userId)) {
        userTimers.set(userId, {});
    }

    const currentTimers = userTimers.get(userId);

    if (currentTimers[reminderKey]) {
        clearTimeout(currentTimers[reminderKey]);
    }

    currentTimers[reminderKey] = setTimeout(() => {
        const isEnabled = userPrefs.getSetting(userId, reminderKey, 'enabled');
        if (!isEnabled) {
            currentTimers[reminderKey] = null;
            return;
        }

        const wantPing = userPrefs.getSetting(userId, reminderKey, 'ping');
        const wantReply = userPrefs.getSetting(userId, reminderKey, 'reply');

        let outMessage = config.message;
        if (wantPing && !wantReply) {
            outMessage = `<@${userId}> ${config.message}`;
        }

        const targetAction = wantReply 
            ? messageCtx.reply({ content: outMessage, allowedMentions: { repliedUser: wantPing } })
            : messageCtx.channel.send(outMessage);

        targetAction
            .then(replyMsg => {
                setTimeout(() => {
                    replyMsg.delete().catch(() => {});
                }, 5000);
            })
            .catch(err => console.error(`[REMINDER ERROR] Send failed: ${err.message}`));
        
        currentTimers[reminderKey] = null;
    }, config.cooldown);
}

module.exports = {
    name: 'owoReminders',
    execute(message) {
        const userId = message.author.id;
        const content = message.content.toLowerCase().replace(/\s+/g, ' ').trim();

        for (const [reminderKey, config] of Object.entries(REMINDERS)) {
            if (config.triggers.includes(content)) {
                const isEnabled = userPrefs.getSetting(userId, reminderKey, 'enabled');
                if (!isEnabled) return;
                
                scheduleReminder(userId, message, reminderKey);
                break;
            }
        }
    },
    shutdown() {
        for (const timers of userTimers.values()) {
            Object.values(timers).forEach(timer => timer && clearTimeout(timer));
        }
    }
};
