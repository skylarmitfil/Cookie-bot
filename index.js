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

// Load Modules
if (fs.existsSync(modulesPath)) {
    fs.readdirSync(modulesPath).filter(file => file.endsWith('.js')).forEach(file => {
        try {
            const mod = require(path.join(modulesPath, file));
            if (mod && mod.name) {
                client.modules.set(mod.name.toLowerCase(), mod);
                if (typeof mod.init === 'function') mod.init(client);
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

// Message Handler
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (client.modules.has(commandName)) {
        try {
            await client.modules.get(commandName).execute(message, args);
        } catch (err) {
            console.error(`[COMMAND ERROR]`, err);
            message.reply('There was an error executing that command.');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
