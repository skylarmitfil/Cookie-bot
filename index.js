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

client.modules = new Map();
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

client.once(Events.ClientReady, () => {
  console.log(`<Active> Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore empty data feeds or automated system bot messages
  if (!message || message.author?.bot) return;

  const prefix = '.';
  const content = message.content.trim();

  const reminderMod = client.modules.get('oworeminders');
  if (reminderMod && typeof reminderMod.execute === 'function') {
    reminderMod.execute(message, prefix).catch(err => {
      console.error('[PASSIVE MODULE ERROR] owoReminders failure:', err);
    });
  }

  const goalMod = client.modules.get('goal');
  if (goalMod && typeof goalMod.handleMessage === 'function') {
    goalMod.handleMessage(message).catch(err => {
      console.error('[PASSIVE MODULE ERROR] Goal counter failure:', err);
    });
  }

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
