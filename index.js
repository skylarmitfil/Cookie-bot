const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.once('ready', () => {
    console.log('ONLINE');
});

client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;

    if (msg.content.toLowerCase() === '!ping') {
        try { 
            await msg.reply('🏓 Pong!'); 
        } catch (e) { 
            console.error(e); 
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
