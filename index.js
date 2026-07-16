require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const OWO_BOT_ID = '287034444583108608'; 
client.commands = new Collection();

// --- SMART PATH RESOLUTION ---
// This checks all typical sub-directories to find captcha.js automatically
let resolvedPath = null;
const potentialPaths = [
    path.join(__dirname, 'captcha.js'),
    path.join(__dirname, 'commands', 'captcha.js'),
    path.join(__dirname, 'src', 'captcha.js'),
    path.join(__dirname, 'src', 'commands', 'captcha.js')
];

for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
        resolvedPath = p;
        break;
    }
}

if (!resolvedPath) {
    console.error("[CRITICAL] captcha.js could not be found anywhere in the repository structure!");
    process.exit(1);
}

console.log(`[BOOT] Found captcha module at: ${resolvedPath}`);
const captchaModule = require(resolvedPath);
client.commands.set(captchaModule.name, captchaModule);

client.once('ready', () => {
    console.log(`[BOOT] ${client.user.tag} is online and active.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot && message.author.id !== OWO_BOT_ID) return;

    if (message.attachments.size > 0) {
        const captchaCommand = client.commands.get('captcha');
        if (captchaCommand) {
            try {
                await captchaCommand.execute(message);
            } catch (err) {
                console.error('[EXECUTION ERROR]: Failed running command.', err);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
