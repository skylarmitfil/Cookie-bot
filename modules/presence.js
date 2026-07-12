const { ActivityType } = require('discord.js');

module.exports = {
    name: 'presence-manager',

    /**
     * Receives the live client instance from index.js
     * @param {import('discord.js').Client} client 
     */
    init: (client) => {
        // 3-second delay ensures the Discord API safely accepts presence state data after handshake
        setTimeout(() => {
            try {
                client.user.setPresence({
                    activities: [{
                        name: 'Watching Your OwO Commands',
                        type: ActivityType.Streaming,
                        url: 'https://youtube.com'
                    }],
                    status: 'online'
                });
                console.log('[PRESENCE] Streaming status applied to Discord API successfully!');
            } catch (error) {
                console.error('[PRESENCE ERROR] Failed to push status update:', error);
            }
        }, 3000);
    },

    /**
     * Required by index.js module architecture.
     */
    execute: (message, prefix) => {
        // No message handling required for this background manager module
    }
};
