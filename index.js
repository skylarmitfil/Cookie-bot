const { Client, GatewayIntentBits, Events } = require('discord.js');
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

client.modules = new Map();

// Load Modules Directory (supports your existing flat file structure)
const modulesPath = path.resolve(__dirname, 'modules');
if (fs.existsSync(modulesPath)) {
  fs.readdirSync(modulesPath)
    .filter(file => file.endsWith('.js'))
    .forEach(file => {
      try {
        const mod = require(path.join(modulesPath, file));
        if (mod && mod.name) {
          client.modules.set(mod.name.toLowerCase(), mod);
          if (typeof mod.init === 'function') {
            mod.init(client);
          }
          console.log(`📦 Loaded: ${mod.name}`);
        }
      } catch (err) {
        console.error(`📦⛔️ Failed to load ${file}:`, err);
      }
    });
}

// Updated to use Events.ClientReady to clear the deprecation warning
client.once(Events.ClientReady, () => {
  console.log(`<Active> Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (!message || message.author?.bot) return;

  const prefix = '.';
  const content = message.content.trim();

  // 1. Pass message to OwO reminders
  const reminderMod = client.modules.get('oworeminders');
  if (reminderMod && typeof reminderMod.execute === 'function') {
    reminderMod.execute(message).catch(err => {
      console.error('[PASSIVE MODULE ERROR] owoReminders failure:', err);
    });
  }

  // 2. Pass message to Goal counter
  const goalMod = client.modules.get('goal');
  if (goalMod && typeof goalMod.handleMessage === 'function') {
    goalMod.handleMessage(message).catch(err => {
      console.error('[PASSIVE MODULE ERROR] Goal counter failure:', err);
    });
  }

  // 3. Command prefix router
  if (!content.startsWith(prefix)) return;

  const args = content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  if (commandName === 'oworeminders') return;

  if (client.modules.has(commandName)) {
    try {
      await client.modules.get(commandName).execute(message, args);
    } catch (err) {
      console.error(`[COMMAND ERROR] Failure executing standard command ${commandName}:`, err);
      message.reply('There was an error executing that command.').catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
