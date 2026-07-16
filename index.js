require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Events, Partials } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel] // Necessary to receive DM events
});

// Initialize global storage for active CAPTCHA sessions
global.activeCaptchas = new Map();
client.modules = new Map();

// Load modules from the 'modules' folder
const modulesPath = path.join(__dirname, 'modules');
fs.readdirSync(modulesPath).filter(file => file.endsWith('.js')).forEach(file => {
    const mod = require(path.join(modulesPath, file));
    if (mod.name) {
        client.modules.set(mod.name, mod);
        if (typeof mod.init === 'function') mod.init(client);
    }
});

client.once(Events.ClientReady, () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
    // 1. Handle DM Reply for Manual CAPTCHA Solving
    if (message.channel.type === 1 && message.author.id === process.env.MY_DISCORD_ID) {
        const [channelId, answer] = message.content.split(':');
        
        if (channelId && answer && global.activeCaptchas.has(channelId)) {
            try {
                const captchaData = global.activeCaptchas.get(channelId);
                const guild = await client.guilds.fetch(captchaData.guildId);
                const channel = await guild.channels.fetch(captchaData.channelId);
                
                await channel.send(`owo autohunt ${answer}`);
                message.reply(`✅ Sent \`owo autohunt ${answer}\` to <#${channelId}>`);
                
                global.activeCaptchas.delete(channelId); // Clear session
            } catch (err) {
                message.reply(`❌ Error: Could not find channel ${channelId}.`);
            }
        }
    }

    // 2. Ignore bot messages
    if (message.author.bot) return;

    // 3. Trigger Captcha Logic if an image is detected
    if (message.attachments.some(a => a.contentType?.startsWith('image/'))) {
        const captchaMod = client.modules.get('captcha');
        if (captchaMod) captchaMod.execute(message);
    }
});

client.login(process.env.DISCORD_TOKEN);
