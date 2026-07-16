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

// FIX: Point directly inside your 'modules' directory to find captcha.js
const captchaPath = path.join(__dirname, 'modules', 'captcha.js');
const captchaModule = require(captchaPath);
client.commands.set(captchaModule.name, captchaModule);

client.once('ready', () => {
    console.log(`[BOOT] ${client.user.tag} is online and listening for OwO images.`);
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
