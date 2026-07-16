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

// Official OwO Bot Discord User ID
const OWO_BOT_ID = '287034444583108608'; 

client.commands = new Collection();

// Load the captcha command module safely using absolute paths
const captchaModule = require('./captcha.js');
client.commands.set(captchaModule.name, captchaModule);

client.once('ready', () => {
    console.log(`[BOOT] ${client.user.tag} is online and listening for OwO images.`);
});

client.on('messageCreate', async (message) => {
    // CRITICAL FIX: If it's a bot, ONLY proceed if it is the OwO bot account
    if (message.author.bot && message.author.id !== OWO_BOT_ID) return;

    // Check if the message contains any file attachments
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

// Login using your environment token variable securely
client.login(process.env.DISCORD_TOKEN);
