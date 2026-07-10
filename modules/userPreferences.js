const disabledUsers = new Map();

module.exports = {
    name: 'userPreferences',
    
    isUserDisabled(userId) {
        return disabledUsers.has(userId);
    },

    execute(message) {
        const content = message.content.toLowerCase().trim();
        const userId = message.author.id;

        const isOffCommand = content === 'owo remind off' || content === 'oworemind off';
        const isOnCommand = content === 'owo remind on' || content === 'oworemind on';

        if (!isOffCommand && !isOnCommand) return;

        let responseMessage = '';

        if (isOffCommand) {
            disabledUsers.set(userId, true);
            responseMessage = '❌ Your OwO reminders have been **disabled**.';
        } else if (isOnCommand) {
            disabledUsers.delete(userId);
            responseMessage = '✅ Your OwO reminders have been **enabled**.';
        }

        message.reply(responseMessage)
            .then(replyMsg => {
                setTimeout(() => {
                    replyMsg.delete().catch(() => {});
                    message.delete().catch(() => {});
                }, 5000);
            })
            .catch(err => console.error(`[PREFS ERROR] Failed reply layout: ${err.message}`));
    },

    shutdown() {
        disabledUsers.clear();
    }
};
