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

client.prefix = '.';
client.modules = new Map();

// 1. Dynamic Module Loader
const modulesPath = path.join(__dirname, 'modules');
if (fs.existsSync(modulesPath)) {
    const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
    for (const file of moduleFiles) {
        const moduleInstance = require(path.join(modulesPath, file));
        if (moduleInstance.name && typeof moduleInstance.execute === 'function') {
            client.modules.set(moduleInstance.name, moduleInstance);
            console.log(`[LOADER] Loaded: ${moduleInstance.name}`);
        }
    }
}

// 2. Lifecycle
client.once(Events.ClientReady, () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
    client.modules.forEach(cog => { if (cog.init) cog.init(client); });
});

// 3. Optimized Router
client.on(Events.MessageCreate, (message) => {
    if (message.author.bot || !message.content.startsWith(client.prefix)) return;

    const args = message.content.slice(client.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Check if the command exists in modules
    const module = client.modules.get(commandName);
    if (module) {
        try {
            module.execute(message, args);
        } catch (err) {
            console.error(`[RUNTIME ERROR]`, err);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
