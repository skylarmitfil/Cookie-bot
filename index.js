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

client.once(Events.ClientReady, async () => {
  console.log(`<Active> Logged in as ${client.user.tag}`);

  try {
    const guildId = '1518659728677277826'; // Your specific server ID
    const guild = await client.guilds.fetch(guildId);

    if (guild) {
      // Register only the correct /reminder command instantly to your guild and clear out old ghost commands
      await guild.commands.set([
        {
          name: 'reminder',
          description: 'Manage custom OwO reminder settings'
        }
      ]);
      console.log('✨ Successfully registered /reminder to your guild and cleared old ghost commands.');
    }
  } catch (err) {
    console.error('Failed to register guild commands:', err);
  }
});

// Slash Command Router
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'reminder') {
    const reminderMod = client.modules.get('reminder');
    if (reminderMod && typeof reminderMod.execute === 'function') {
      // Create a mock message object wrapper so reminderMod.execute works seamlessly with slash commands
      const mockMessage = {
        author: interaction.user,
        client: interaction.client,
        channel: interaction.channel,
        guild: interaction.guild,
        reply: async (options) => {
          if (interaction.replied || interaction.deferred) {
            return interaction.followUp(options);
          }
          return interaction.reply(options);
        }
      };

      // Pass empty args or extract options if subcommands are added later
      await reminderMod.execute(mockMessage, []);
    } else {
      await interaction.reply({ content: '❌ Reminder module is not loaded correctly.', ephemeral: true });
    }
  }
});

// Text Prefix Message Router
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

  // 2. Command prefix router
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
