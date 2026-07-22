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
                        url: 'https://www.youtube.com/watch?v=m9nnMSwiGag' 
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
