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
        messageCtx.reply(config.message)
            .then(replyMsg => {
                setTimeout(() => {
                    replyMsg.delete().catch(err => 
                        console.error(`Failed to delete reminder message: ${err.message}`)
                    );
                }, 5000);
            })
            .catch(err => console.error(`Failed to send reply reminder: ${err.message}`));
        
        currentTimers[timerKey] = null;
    }, config.cooldown);
}

module.exports = {
    name: 'owoReminders',
    execute(message) {
        const content = message.content.toLowerCase().replace(/\s+/g, ' ').trim();
        const userId = message.author.id;

        for (const [key, config] of Object.entries(REMINDERS)) {
            const matchesTrigger = config.triggers.includes(content);

            if (matchesTrigger) {
                scheduleReminder(userId, message, key);
                break;
            }
        }
    },
    shutdown() {
        console.log('[OWO MODULE] Clearing active intervals...');
        for (const timers of userTimers.values()) {
            Object.values(timers).forEach(timer => timer && clearTimeout(timer));
        }
    }
};
