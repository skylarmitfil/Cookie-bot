const userPrefs = require('./userPreferences');

const REMINDERS = {
    'Hunt/Battle': {
        cooldown: 15 * 1000,
        message: 'owo hunt/owo battle <:hunt_battle:1520116392756772944>',
        triggers: [
            'owo hunt', 'owohunt', 'owoh', 'owo h', 'wh',
            'owo battle', 'owobattle', 'owob', 'owo b', 'wb'
        ]
    },
    'OwO': {
        cooldown: 8 * 1000,
        message: 'owo/uwu',
        triggers: ['owo', 'uwu']
    },
    'Pray/Curse': {
        cooldown: 300 * 1000,
        message: 'owo pray/owo curse <:Praycurse:1520116373408317570>',
        triggers: ['owo pray', 'owopray', 'owo curse', 'owocurse']
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
        if (userPrefs.isReminderDisabled(userId, reminderKey)) {
            currentTimers[reminderKey] = null;
            return;
        }

        messageCtx.reply(config.message)
            .then(replyMsg => {
                setTimeout(() => {
                    replyMsg.delete().catch(err => 
                        console.error(`[REMINDER ERROR] Auto-delete failed: ${err.message}`)
                    );
                }, 5000);
            })
            .catch(err => console.error(`[REMINDER ERROR] Reply failed: ${err.message}`));
        
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
                if (userPrefs.isReminderDisabled(userId, reminderKey)) return;
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
