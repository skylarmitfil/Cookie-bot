require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Events } = require('discord.js');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Configure bot globals
client.prefix = '.';
client.modules = new Map();

// 1. Dynamic Module Loader
const modulesPath = path.join(__dirname, 'modules');
if (fs.existsSync(modulesPath)) {
    const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
    
    for (const file of moduleFiles) {
        try {
            const moduleInstance = require(path.join(modulesPath, file));
            
            // Validate module structure before adding to map
            if (moduleInstance.name && typeof moduleInstance.execute === 'function') {
                client.modules.set(moduleInstance.name, moduleInstance);
                console.log(`[LOADER] Successfully loaded cog: ${moduleInstance.name}`);
            }
        } catch (error) {
            console.error(`[LOADER] Failed to load module ${file}:`, error);
        }
    }
}

// 2. Lifecycle Events (Upgraded to ClientReady for discord.js v15 compatibility)
client.once(Events.ClientReady, () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
    
    // Explicitly scan the module Map and fire initialization blocks
    client.modules.forEach(cog => {
        if (typeof cog.init === 'function') {
            try {
                cog.init(client);
                console.log(`[INIT] Activated startup sequence for: ${cog.name}`);
            } catch (initError) {
                console.error(`[INIT ERROR] Failed running init block on '${cog.name}':`, initError);
            }
        }
    });
});

// 3. Message Event Router
client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;

    client.modules.forEach(cog => {
        try {
            cog.execute(message, client.prefix);
        } catch (error) {
            console.error(`[RUNTIME ERROR] Exception inside '${cog.name}':`, error);
        }
    });
});

// 4. Global Error Catching (Crucial to prevent live crashes)
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception thrown:', err);
});

// 5. Graceful Teardown
process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] SIGTERM received. Cleaning up...');
    client.modules.forEach(cog => {
        if (typeof cog.shutdown === 'function') {
            try {
                cog.shutdown();
            } catch (e) {
                console.error(`[SHUTDOWN ERROR] Failed on '${cog.name}':`, e);
            }
        }
    });
    client.destroy();
    process.exit(0);
});

// Start the bot
client.login(process.env.DISCORD_TOKEN);
