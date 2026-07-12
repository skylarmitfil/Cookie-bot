const { ActivityType } = require('discord.js');

module.exports = {
    name: 'presence-manager',

    /**
     * Initializes the streaming presence status when the bot is ready.
     * @param {import('discord.js').Client} client 
     */
    init: (client) => {
        try {
            client.user.setPresence({
                activities: [{
                    name: 'Watching Your OwO Commands',
                    type: ActivityType.Streaming,
                    url: 'https://youtube.com'
                }],
                status: 'online'
            });
            console.log('[PRESENCE] Streaming status applied successfully.');
        } catch (error) {
            console.error('[PRESENCE ERROR] Failed to set bot presence:', error);
        }
    },

    /**
     * Required by index.js module architecture.
     * Left blank because this file only manages background presence.
     */
    execute: (message, prefix) => {
        // No message handling required for this module
    }
};
