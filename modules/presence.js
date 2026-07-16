const { ActivityType } = require('discord.js');

module.exports = {
    name: 'presence-manager',

    init: (client) => {
        // Remove setTimeout. ClientReady guarantees client.user is ready.
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
            console.error('[PRESENCE ERROR] Failed to push status update:', error);
        }
    },

    execute: (message, prefix) => {}
};
