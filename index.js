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

// Load modules
const modulesPath = path.join(__dirname, 'modules');
if (fs.existsSync(modulesPath)) {
    fs.readdirSync(modulesPath).filter(f => f.endsWith('.js')).forEach(file => {
        const mod = require(path.join(modulesPath, file));
        if (mod.name) client.modules.set(mod.name, mod);
    });
}

client.once(Events.ClientReady, () => {
    // Wait for the client to be fully ready before accessing client.user
    if (client.user) {
        console.log(`[ONLINE] Logged in as ${client.user.tag}`);
        
        // Safely trigger all module init functions
        client.modules.forEach(mod => {
            if (typeof mod.init === 'function') {
                try {
                    mod.init(client);
                } catch (err) {
                    console.error(`[INIT ERROR] in ${mod.name}:`, err);
                }
            }
        });
    }
});

client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;

    // Detect image attachment for captcha
    if (message.attachments.some(a => a.contentType?.startsWith('image/'))) {
        const captcha = client.modules.get('captcha');
        if (captcha) captcha.execute(message);
    }
});

client.login(process.env.DISCORD_TOKEN);
