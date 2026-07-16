require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
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

// Absolute directory tracking inside the modules/ subfolder
const captchaPath = path.join(__dirname, 'modules', 'captcha.js');
const captchaModule = require(captchaPath);
client.commands.set(captchaModule.name, captchaModule);

// FIXED: Using the modern clientReady token name to satisfy the deprecation notice
client.once('clientReady', () => {
    console.log(`[BOOT] ${client.user.tag} is online and active on Railway.`);
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
