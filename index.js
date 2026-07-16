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
    fs.readdirSync(modulesPath).filter(file => file.endsWith('.js')).forEach(file => {
        const mod = require(path.join(modulesPath, file));
        if (mod.name) client.modules.set(mod.name, mod);
    });
}

client.on(Events.MessageCreate, async (message) => {
    // Ignore bots
    if (message.author.bot) return;

    // Check for images
    if (message.attachments.some(a => a.contentType?.startsWith('image/'))) {
        const captchaMod = client.modules.get('captcha');
        if (captchaMod) captchaMod.execute(message);
    }
});

client.login(process.env.DISCORD_TOKEN);
