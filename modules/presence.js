const { ActivityType } = require('discord.js');

module.exports = {
    name: 'presence-manager',
    init: (client) => {
        try {
            client.user.setPresence({
                activities: [{
                    name: 'Watching Your OwO Commands',
                    type: ActivityType.Streaming,
                    url: 'https://www.youtube.com/watch?v=WaSy8yy-mr8'
                }],
                status: 'online'
            });
            console.log('[PRESENCE] Streaming status applied successfully!');
        } catch (error) {
            console.error('[PRESENCE ERROR]:', error);
        }
    },
    execute: () => {}
};
