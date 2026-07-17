const { ActivityType, Events } = require('discord.js');

module.exports = {
    name: 'presence-manager',
    init: (client) => {
        client.once(Events.ClientReady, () => {
            try {
                client.user.setPresence({
                    activities: [{
                        name: 'Watching Your OwO Commands',
                        type: ActivityType.Streaming, 
                        // You MUST use a valid twitch.tv URL for the 'Watch' button to appear
                        url: 'https://m.youtube.com/watch?v=h7oSlZL0tEM&list=RDh7oSlZL0tEM&start_radio=1' 
                    }],
                    status: 'online'
                });
                console.log('[PRESENCE] Streaming status applied!');
            } catch (error) {
                console.error('[PRESENCE ERROR]:', error);
            }
        });
    },
    execute: () => {}
};
