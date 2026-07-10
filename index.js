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

client.prefix = '.';
client.modules = new Map();

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

client.once('ready', () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
    client.user.setPresence({
        activities: [{
            name: 'Watching Your OwO Commands',
            type: ActivityType.Streaming,
            url: 'https://www.youtube.com/watch?v=h7oSlZL0tEM&list=RDMMh7oSlZL0tEM&index=1'
        }],
        status: 'online'
    });
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    client.modules.forEach(cog => {
        try {
            cog.execute(message, client.prefix);
        } catch (error) {
            console.error(`[RUNTIME ERROR] Exception inside '${cog.name}':`, error);
        }
    });
});

process.on('SIGTERM', () => {
    client.modules.forEach(cog => {
        if (typeof cog.shutdown === 'function') cog.shutdown();
    });
    client.destroy();
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
