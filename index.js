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
const modulesPath = path.resolve(__dirname, 'modules');

// Load all modules safely
if (fs.existsSync(modulesPath)) {
    fs.readdirSync(modulesPath).filter(file => file.endsWith('.js')).forEach(file => {
        try {
            const mod = require(path.join(modulesPath, file));
            if (mod && mod.name) {
                client.modules.set(mod.name.toLowerCase(), mod);
                console.log(`[LOADER] Loaded: ${mod.name}`);
            }
        } catch (err) {
            console.error(`[LOADER] Failed to load ${file}:`, err);
        }
    });
}

client.once(Events.ClientReady, () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
