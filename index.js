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

// Dynamic Module Folder Loader Pipeline
const modulesPath = path.join(__dirname, 'modules');

try {
    if (fs.existsSync(modulesPath)) {
        const commandFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(modulesPath, file);
            const command = require(filePath);
            if (command.name && typeof command.execute === 'function') {
                client.commands.set(command.name, command);
                console.log(`[LOADER] Registered module command: ${command.name}`);
            }
        }
    } else {
        console.error(`[LOADER CRITICAL]: "modules" folder missing at ${modulesPath}`);
    }
} catch (error) {
    console.error('[LOADER ERROR]: Failed loading files:', error);
}

client.once('clientReady', () => {
    console.log(`[BOOT] ${client.user.tag} is online and tracking messages.`);
});

client.on('messageCreate', async (message) => {
    // Stop if it isn't the official OwO bot account
    if (message.author.id !== OWO_BOT_ID) return;

    let targetImageUrl = null;

    // Check Case A: Traditional File Attachments
    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment.contentType?.startsWith('image/')) {
            targetImageUrl = attachment.url;
        }
    } 
    // Check Case B: Rich Embed Images (OwO Bot Layout Fallback)
    else if (message.embeds.length > 0 && message.embeds[0].image) {
        targetImageUrl = message.embeds[0].image.url;
    }

    // If an image URL was verified, execute the captcha algorithm module
    if (targetImageUrl) {
        const captchaCommand = client.commands.get('captcha');
        if (captchaCommand) {
            try {
                // Pass the verified image URL directly down into the command context
                await captchaCommand.execute(message, targetImageUrl);
            } catch (err) {
                console.error('[EXECUTION ERROR]: Failed running captcha module.', err);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
