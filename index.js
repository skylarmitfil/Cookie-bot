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

// Initialize the collection for commands
client.modules = new Map();
const modulesPath = path.resolve(__dirname, 'modules');

// 1. Load all modules
if (fs.existsSync(modulesPath)) {
    fs.readdirSync(modulesPath).filter(file => file.endsWith('.js')).forEach(file => {
        try {
            const mod = require(path.join(modulesPath, file));
            if (mod && mod.name) {
                client.modules.set(mod.name.toLowerCase(), mod);
                
                // If the module has an init function, run it immediately
                if (typeof mod.init === 'function') {
                    mod.init(client);
                }
                
                console.log(`[LOADER] Loaded: ${mod.name}`);
            }
        } catch (err) {
            console.error(`[LOADER] Failed to load ${file}:`, err);
        }
    });
}

// 2. Client ready event
client.once(Events.ClientReady, () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
});

// 3. Message handler
client.on(Events.MessageCreate, async (message) => {
    // Ignore bots and non-prefixed messages
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Check if the command exists in our loaded modules
    if (client.modules.has(commandName)) {
        try {
            await client.modules.get(commandName).execute(message, args);
        } catch (err) {
            console.error(`[COMMAND ERROR] Failed to execute ${commandName}:`, err);
            message.reply('There was an error executing that command.');
        }
    }
});

// 4. Log in
client.login(process.env.DISCORD_TOKEN);
