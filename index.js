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

// FIX: Dynamic Module Folder Loader Checklist
const modulesPath = path.join(__dirname, 'modules');

try {
    if (fs.existsSync(modulesPath)) {
        const commandFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            const filePath = path.join(modulesPath, file);
            const command = require(filePath);
            
            if (command.name && typeof command.execute === 'function') {
                client.commands.set(command.name, command);
                console.log(`[LOADER] Successfully registered module command: ${command.name}`);
            }
        }
    } else {
        console.error(`[LOADER CRITICAL]: The "modules" folder does not exist at ${modulesPath}`);
    }
} catch (error) {
    console.error('[LOADER ERROR]: Fails to dynamically resolve file collections:', error);
}

client.once('clientReady', () => {
    console.log(`[BOOT] ${client.user.tag} is online and watching for OwO bot updates.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot && message.author.id !== OWO_BOT_ID) return;

    if (message.attachments.size > 0) {
        // Looks inside our dynamically filled module collection
        const captchaCommand = client.commands.get('captcha');
        if (captchaCommand) {
            try {
                await captchaCommand.execute(message);
            } catch (err) {
                console.error('[EXECUTION ERROR]: Failed running command module.', err);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
