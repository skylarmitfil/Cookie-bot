require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Events } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.modules = new Map();

// FIX: Use path.resolve to ensure absolute paths are found
const modulesPath = path.resolve(__dirname, 'modules');

console.log(`[SYSTEM] Looking for modules in: ${modulesPath}`);

if (fs.existsSync(modulesPath)) {
    fs.readdirSync(modulesPath).filter(file => file.endsWith('.js')).forEach(file => {
        const mod = require(path.join(modulesPath, file));
        if (mod.name) {
            client.modules.set(mod.name, mod);
            // If the module has an init function, run it now
            if (typeof mod.init === 'function') {
                mod.init();
                console.log(`[SYSTEM] Initialized module: ${mod.name}`);
            }
        }
    });
} else {
    console.error(`[ERROR] Modules directory not found at ${modulesPath}`);
}

client.login(process.env.DISCORD_TOKEN);
