module.exports = {
    name: 'presence-manager',
    // Custom method to run once when the bot is ready
    init: (client) => {
        const { ActivityType } = require('discord.js');
        
        client.user.setPresence({
            activities: [{
                name: 'Watching Your OwO Commands',
                type: ActivityType.Streaming,
                url: 'https://www.youtube.com/watch?v=h7oSlZL0tEM'
            }],
            status: 'online'
        });
        console.log('[PRESENCE] Streaming status set up successfully.');
    },
    // Keep your required execute function so your loader doesn't crash
    execute: (message, prefix) => {
        // Leave empty if this module only handles status updates
    }
};
