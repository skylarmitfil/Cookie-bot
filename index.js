require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, ActivityType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Holds all dynamically scanned cogs
client.modules = new Map();

// 1. Module Scanner (Scans your modules folder)
const modulesPath = path.join(__dirname, 'modules');
if (fs.existsSync(modulesPath)) {
    const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));

    for (const file of moduleFiles) {
        try {
            const moduleInstance = require(path.join(modulesPath, file));
            if (moduleInstance.name && typeof moduleInstance.execute === 'function') {
                client.modules.set(moduleInstance.name, moduleInstance);
                console.log(`[LOADER] Successfully loaded cog: ${moduleInstance.name}`);
            }
        } catch (error) {
            console.error(`[LOADER] Failed to load module ${file}:`, error);
        }
    }
}

// 2. Events & Streaming Status Configuration
client.once('ready', () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
    
    // Set purple streaming badge activity presence
    client.user.setPresence({
        activities: [{
            name: 'Helping With OwO Reminders',
            type: ActivityType.Streaming,
            url: 'https://www.youtube.com/watch?v=h7oSlZL0tEM&list=RDMMh7oSlZL0tEM&start_radio=1'
        }],
        status: 'online'
    });
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    // Send the channel message event to all loaded modules
    client.modules.forEach(cog => {
        try {
            cog.execute(message);
        } catch (error) {
            console.error(`[RUNTIME ERROR] Exception inside '${cog.name}':`, error);
        }
    });
});

// 3. Railway Graceful Shutdown Environment Cleanup
process.on('SIGTERM', () => {
    client.modules.forEach(cog => {
        if (typeof cog.shutdown === 'function') cog.shutdown();
    });
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
