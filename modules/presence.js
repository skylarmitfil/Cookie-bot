const { ActivityType } = require('discord.js');

module.exports = {
    name: 'presence-manager',

    /**
     * Initializes the streaming presence status when the bot is ready.
     * @param {import('discord.js').Client} client 
     */
    init: (client) => {
        // Delaying by 3 seconds ensures Discord safely processes the presence state on launch
        setTimeout(() => {
            try {
                client.user.setPresence({
                    activities: [{
                        name: 'Watching Your OwO Commands',
                        type: ActivityType.Streaming,
                        url: 'https://youtube.com' // Absolute direct URL
                    }],
                    status: 'online'
                });
                console.log('[PRESENCE] Streaming status initialized and visible!');
            } catch (error) {
                console.error('[PRESENCE ERROR] Failed to set bot presence:', error);
            }
        }, 3000); 
    },

    /**
     * Required by index.js module architecture.
     */
    execute: (message, prefix) => {
        // Leave empty as this is a background worker
    }
};
