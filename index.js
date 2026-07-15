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
        try {
            const moduleInstance = require(path.join(modulesPath, file));
            if (moduleInstance.name && typeof moduleInstance.execute === 'function') {
                client.modules.set(moduleInstance.name, moduleInstance);
                console.log(`[LOADER] Successfully loaded cog: ${moduleInstance.name}`);
            }
        } catch (error) {
            console.error(`[LOADER] Failed to load module ${file}:`, error);
        }
    }
}

// 2. Lifecycle Events
client.once(Events.ClientReady, () => {
    console.log(`[ONLINE] Logged in as ${client.user.tag}`);
    client.modules.forEach(cog => {
        if (typeof cog.init === 'function') {
            try {
                cog.init(client);
            } catch (initError) {
                console.error(`[INIT ERROR] Failed running init block on '${cog.name}':`, initError);
            }
        }
    });
});

// 3. Message Event Router
client.on(Events.MessageCreate, (message) => {
    if (message.author.bot) return;
    client.modules.forEach(cog => {
        try {
            cog.execute(message, client.prefix);
        } catch (error) {
            console.error(`[RUNTIME ERROR] Exception inside '${cog.name}':`, error);
        }
    });
});

// 4. Interaction Handler (The new part)
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId.startsWith('help_nav_menu_')) {
        const ownerId = interaction.customId.split('_').pop();
        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: "These aren't your settings!", ephemeral: true });
        }

        const selected = interaction.values[0];
        await interaction.update({
            content: `You selected the **${selected}** category.`,
            // Components are kept so the user can switch categories again
            components: [interaction.message.components[0]]
        });
    }
});

// 5. Global Error Catching
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught Exception thrown:', err);
});

// 6. Graceful Teardown
process.on('SIGTERM', () => {
    client.destroy();
    process.exit(0);
});

// Start the bot
client.login(process.env.DISCORD_TOKEN);
