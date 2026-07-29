const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.modules = new Collection();

// Load modules from the 'modules' folder
const modulesPath = path.join(__dirname, 'modules');
if (fs.existsSync(modulesPath)) {
  const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith('.js'));
  for (const file of moduleFiles) {
    const filePath = path.join(modulesPath, file);
    const mod = require(filePath);
    if (mod.name) {
      client.modules.set(mod.name, mod);
      // Run init if available
      if (typeof mod.init === 'function') {
        mod.init(client);
      }
      console.log(`Loaded module: ${mod.name}`);
    }
  }
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  // 1. Background listener for incoming OwO quest messages & notifications
  if (client.modules) {
    for (const mod of client.modules.values()) {
      if (typeof mod.handleIncomingQuests === 'function') {
        try {
          await mod.handleIncomingQuests(message);
        } catch (err) {
          console.error(`Error in handleIncomingQuests for module ${mod.name}:`, err);
        }
      }
    }
  }

  // 2. Ignore other bot messages for normal command processing
  if (message.author.bot) return;

  const content = message.content.trim();
  const args = content.split(/ +/);
  const firstWord = args.shift()?.toLowerCase();

  // 3. Handle prefix commands (like .q or other modules)
  if (content.startsWith('.')) {
    const cmdName = content.slice(1).trim().split(/ +/)[0].toLowerCase();
    if (client.modules.has(cmdName)) {
      try {
        await client.modules.get(cmdName).execute(message, args);
      } catch (err) {
        console.error(`Error executing command ${cmdName}:`, err);
      }
    }
  }
});

// Replace with your bot token or environment variable
client.login(process.env.DISCORD_TOKEN);
