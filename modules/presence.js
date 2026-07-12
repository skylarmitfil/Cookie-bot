const { ActivityType } = require('discord.js');

module.exports = {
    name: 'presence-manager',

    /**
     * Initializes the streaming presence status when the bot is ready.
     * @param {import('discord.js').Client} client 
     */
    init: (client) => {
        // 3-second delay ensuring Discord accepts the presence registration post-handshake
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
                console.log('[PRESENCE] Streaming status applied successfully!');
            } catch (error) {
                console.error('[PRESENCE ERROR] Failed to set bot presence:', error);
            }
        }, 3000);
    },

    /**
     * Required by index.js module architecture.
     */
    execute: (message, prefix) => {
        // No message handling required for this module
    }
};
