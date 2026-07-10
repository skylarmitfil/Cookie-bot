const userPrefs = require('./userPreferences');

const REMINDERS = {
    HUNT_BATTLE: {
        cooldown: 15 * 1000,
        message: 'owo hunt/owo battle <:hunt_battle:1520116392756772944>',
        triggers: [
            'owo hunt', 'owohunt', 'owoh', 'owo h', 'wh',
            'owo battle', 'owobattle', 'owob', 'owo b', 'wb'
        ]
    },
    PURE_OWO: {
        cooldown: 8 * 1000,
        message: 'owo/uwu',
        triggers: ['owo', 'uwu']
    },
    PRAY_CURSE: {
        cooldown: 300 * 1000,
        message: 'owo pray/owo curse <:Praycurse:1520116373408317570>',
        triggers: ['owo pray', 'owopray', 'owo curse', 'owocurse']
    }
};

const userTimers = new Map();

function scheduleReminder(userId, messageCtx, timerKey) {
    const config = REMINDERS[timerKey];
    
    if (!userTimers.has(userId)) {
        userTimers.set(userId, {});
    }

    const currentTimers = userTimers.get(userId);

    if (currentTimers[timerKey]) {
        clearTimeout(currentTimers[timerKey]);
    }

    currentTimers[timerKey] = setTimeout(() => {
        if (userPrefs.isUserDisabled(userId)) {
            currentTimers[timerKey] = null;
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
        
        currentTimers[timerKey] = null;
    }, config.cooldown);
}

module.exports = {
    name: 'owoReminders',
    execute(message) {
        const userId = message.author.id;

        if (userPrefs.isUserDisabled(userId)) return;

        const content = message.content.toLowerCase().replace(/\s+/g, ' ').trim();

        for (const [key, config] of Object.entries(REMINDERS)) {
            if (config.triggers.includes(content)) {
                scheduleReminder(userId, message, key);
                break;
            }
        }
    },
    shutdown() {
        console.log('[OWO MODULE] Clearing all scheduled timers...');
        for (const timers of userTimers.values()) {
            Object.values(timers).forEach(timer => timer && clearTimeout(timer));
        }
    }
};
