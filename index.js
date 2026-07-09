require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// A collection map to hold all loaded modules (Cogs)
client.modules = new Map();

// 1. Dynamic Module Loader
const modulesPath = path.join(__dirname, 'modules');
if (fs.existsSync(modulesPath)) {
    const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));

    for (const file of moduleFiles) {
        try {
            const moduleInstance = require(path.join(modulesPath, file));
            
            // Register the module using its defined name property
            if (moduleInstance.name && typeof moduleInstance.execute === 'function') {
                client.modules.set(moduleInstance.name, moduleInstance);
                console.log(`[LOADER] Successfully loaded cog: ${moduleInstance.name}`);
            } else {
                console.warn(`[LOADER] Skipped ${file}: Missing 'name' or 'execute()' function.`);
            }
        } catch (error) {
            console.error(`[LOADER] Failed to load module ${file}:`, error);
        }
    }
} else {
    console.error(`[LOADER] Critical Error: 'modules' directory not found!`);
}

// 2. Event Listeners
client.once('ready', () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
    console.log(`[SYSTEM] Running with ${client.modules.size} active cogs.`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    // Pipe the message into every loaded module dynamically
    client.modules.forEach(cog => {
        try {
            cog.execute(message);
        } catch (error) {
            console.error(`[RUNTIME ERROR] Exception thrown inside cog '${cog.name}':`, error);
        }
    });
});

// 3. Graceful Shutdown (Railway Environment Cleanup)
process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] Signal received. Cleaning module structures...');
    
    // Trigger the internal shutdown/clear timeout routine for each cog
    client.modules.forEach(cog => {
        if (typeof cog.shutdown === 'function') cog.shutdown();
    });
    
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
