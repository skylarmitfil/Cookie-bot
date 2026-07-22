require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Events } = require('discord.js');

// Initialize client with critical Message Content Gateway Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.modules = new Map();
const modulesPath = path.resolve(__dirname, 'modules');

// Load modules dynamically from directory
if (fs.existsSync(modulesPath)) {
  fs.readdirSync(modulesPath)
    .filter(file => file.endsWith('.js'))
    .forEach(file => {
      try {
        const mod = require(path.join(modulesPath, file));
        if (mod && mod.name) {
          // Store module names in lowercase for safe lookup match consistency
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

client.once(Events.ClientReady, () => {
  console.log(`<Active> Logged in as ${client.user.tag}`);
});

// Message Event Handler for Commands AND Passive Listening Background Tasks
client.on(Events.MessageCreate, async (message) => {
  // Ignore empty data feeds or automated system bot messages
  if (!message || message.author?.bot) return;

  const prefix = '.';
  const content = message.content.trim();

  // 1. --- PASSIVE TRACKING PIPELINE --- 
  // Sends text streams directly to your background reminder file

  // [A] Run owoReminders passive background pipeline
  const reminderMod = client.modules.get('oworeminders');
  if (reminderMod && typeof reminderMod.execute === 'function') {
    reminderMod.execute(message, prefix).catch(err => {
      console.error('[PASSIVE MODULE ERROR] owoReminders failure:', err);
    });
  }

  // [B] Run your Goal Tracking background counter pipeline
  const goalMod = client.modules.get('goal');
  if (goalMod && typeof goalMod.handleMessage === 'function') {
    goalMod.handleMessage(message).catch(err => {
      console.error('[PASSIVE MODULE ERROR] Goal counter failure:', err);
    });
  }


  // 2. --- EXPLICIT PREFIX COMMAND PIPELINE --- 
  // Only process standard bot commands if they start with the prefix string
  if (!content.startsWith(prefix)) return;

  const args = content.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  // Prevent running the tracking/reminder modules as direct prefix text commands
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

// Login using your secure application environment token
client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
