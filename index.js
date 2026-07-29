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
    const guildId = '1518659728677277826';
    const guild = await client.guilds.fetch(guildId);

    if (guild) {
      await guild.commands.set([
        {
          name: 'reminder',
          description: 'Manage custom OwO reminder settings'
        }
      ]);
      console.log('✨ Successfully registered /reminder command.');
    }
  } catch (err) {
    console.error('Failed to register guild commands:', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'reminder') {
    const reminderMod = client.modules.get('reminder');
    if (reminderMod && typeof reminderMod.execute === 'function') {
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

      await reminderMod.execute(mockMessage, []);
    } else {
      await interaction.reply({ content: '❌ Reminder module is not loaded correctly.', ephemeral: true });
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!message) return;

  // Track active user context before bot filters trigger
  if (message.author && !message.author.bot && client.recentQuestActivity) {
    client.recentQuestActivity.set(message.channelId, {
      id: message.author.id,
      username: message.author.username,
      timestamp: Date.now()
    });
  }

  if (!message.author?.bot) {
    const reminderMod = client.modules.get('oworeminders');
    if (reminderMod && typeof reminderMod.execute === 'function') {
      reminderMod.execute(message).catch(err => {
        console.error('[PASSIVE MODULE ERROR] owoReminders failure:', err);
      });
    }
  }

  const goalMod = client.modules.get('goal');
  if (goalMod && typeof goalMod.handleMessage === 'function') {
    goalMod.handleMessage(message).catch(err => {
      console.error('[PASSIVE MODULE ERROR] goal handleMessage failure:', err);
    });
  }

  const questMod = client.modules.get('q');
  if (questMod && typeof questMod.handleIncomingQuests === 'function') {
    questMod.handleIncomingQuests(message)
      .then(data => {
        if (data) console.log(`🟢 Successfully tracked quest for: ${data.username}`);
      })
      .catch(err => {
        console.error('[PASSIVE MODULE ERROR] quest handleIncomingQuests failure:', err);
      });
  }

  if (message.author?.bot) return;

  const prefix = '.';
  const content = message.content.trim();

  if (!content.startsWith(prefix)) {
    const spaceIndex = content.indexOf(' ');
    const firstWord = (spaceIndex === -1 ? content : content.slice(0, spaceIndex)).toLowerCase();
    
    if (firstWord === 'owo' || firstWord === 'w') {
      const subArgs = spaceIndex === -1 ? [] : content.slice(spaceIndex + 1).trim().split(/ +/);
      const subCommand = subArgs.shift()?.toLowerCase();
      
      if (subCommand && client.modules.has(subCommand)) {
        try {
          await client.modules.get(subCommand).execute(message, subArgs);
          return;
        } catch (err) {
          console.error(`[COMMAND ERROR] Failure executing owo command ${subCommand}:`, err);
        }
      }
    }
    return;
  }

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
