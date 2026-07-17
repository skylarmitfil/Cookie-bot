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
                        url: 'https://m.twitch.tv/skylar_mitifil/home'
                });
                console.log('[PRESENCE] Streaming status applied!');
            } catch (error) {
                console.error('[PRESENCE ERROR]:', error);
            }
        });
    },
    execute: () => {}
};
