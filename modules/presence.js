const { ActivityType, Events } = require('discord.js');

module.exports = {
    name: 'presence-manager',
    init: (client) => {
        // We wait for the client to be ready before setting the presence
        client.once(Events.ClientReady, () => {
            try {
                client.user.setPresence({
                    activities: [{
                        name: 'Watching Your OwO Commands',
                        type: ActivityType.Watching, // Changed to Watching
                        // URL only works for Streaming; for others, it's not needed
                    }],
                    status: 'online'
                });
                console.log('[PRESENCE] Status set successfully!');
            } catch (error) {
                console.error('[PRESENCE ERROR]:', error);
            }
        });
    },
    execute: () => {}
};
