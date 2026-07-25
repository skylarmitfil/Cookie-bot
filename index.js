const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.modules = new Collection();
client.commands = new Collection();

// Load Modules Directory
const modulesPath = path.join(__dirname, 'modules');
if (fs.existsSync(modulesPath)) {
  const moduleFolders = fs.readdirSync(modulesPath);
  for (const folder of moduleFolders) {
    const modulePath = path.join(modulesPath, folder, `${folder}.js`);
    if (fs.existsSync(modulePath)) {
      try {
        const mod = require(modulePath);
        if (mod.name) {
          client.modules.set(mod.name, mod);
          console.log(`[MODULE] Loaded: ${mod.name}`);
        }
      } catch (error) {
        console.error(`[MODULE ERROR] Failed to load module ${folder}:`, error);
      }
    }
  }
}

client.once('ready', () => {
  console.log(`[READY] Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
  // Ignore normal bot messages to avoid loops, but allow your text prefixes/OwO tracking
  if (message.author.bot && message.author.id === client.user.id) return;

  const prefix = '.'; // Adjust your text prefix if needed

  // 1. Pass message to the OwO reminder system
  const reminderMod = client.modules.get('oworeminders');
  if (reminderMod && typeof reminderMod.execute === 'function') {
    try {
      await reminderMod.execute(message);
    } catch (err) {
      console.error('[REMINDER ERROR]:', err);
    }
  }

  // 2. Pass message to the Goal tracking system
  const goalMod = client.modules.get('goal');
  if (goalMod && typeof goalMod.handleMessage === 'function') {
    try {
      await goalMod.handleMessage(message);
    } catch (err) {
      console.error('[GOAL HANDLER ERROR]:', err);
    }
  }

  // 3. Standard text command execution handling
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const commandModule = client.modules.get(commandName);
  if (commandModule && typeof commandModule.execute === 'function') {
    try {
      await commandModule.execute(message, args);
    } catch (error) {
      console.error(`[COMMAND ERROR] Failed to execute ${commandName}:`, error);
      await message.reply('❌ There was an error executing that command.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
