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

// Path to your modules folder
const modulesPath = path.resolve(__dirname, 'modules');

console.log(`[SYSTEM] Starting module loader at: ${modulesPath}`);

// Safely load all files in the modules folder
if (fs.existsSync(modulesPath)) {
    fs.readdirSync(modulesPath).filter(file => file.endsWith('.js')).forEach(file => {
        try {
            const mod = require(path.join(modulesPath, file));
            
            // Check if the module has a name property
            if (mod && mod.name) {
                client.modules.set(mod.name.toLowerCase(), mod);
                console.log(`[LOADER] Successfully loaded: ${mod.name}`);
                
                // If the module has an init function, run it
                if (typeof mod.init === 'function') {
                    mod.init().catch(err => console.error(`[INIT ERROR] ${mod.name}:`, err));
                }
            } else {
                console.warn(`[LOADER] Skipped ${file}: Missing 'name' property.`);
            }
        } catch (err) {
            console.error(`[LOADER] Failed to load ${file}:`, err);
        }
    });
} else {
    console.error(`[ERROR] Directory not found: ${modulesPath}`);
}

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // Trigger the 'captcha' module if an image is detected
    if (message.attachments.some(a => a.contentType?.startsWith('image/'))) {
        const captchaMod = client.modules.get('captcha');
        if (captchaMod) {
            await captchaMod.execute(message);
        } else {
            console.warn("[SYSTEM] Captcha module not found in client.modules.");
        }
    }
});

client.once(Events.ClientReady, () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN).catch(console.error);
