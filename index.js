require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Events } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.modules = new Map();

const modulesPath = path.join(__dirname, 'modules');

if (fs.existsSync(modulesPath)) {
    fs.readdirSync(modulesPath).filter(file => file.endsWith('.js')).forEach(file => {
        try {
            const mod = require(path.join(modulesPath, file));
            if (mod.name) {
                client.modules.set(mod.name, mod);
                if (typeof mod.init === 'function') {
                    mod.init().catch(e => console.error(`[INIT ERROR] ${mod.name}:`, e));
                }
            }
        } catch (err) {
            console.error(`[LOAD ERROR] Failed to load ${file}:`, err);
        }
    });
}

client.login(process.env.DISCORD_TOKEN).catch(err => console.error("Login failed:", err));
