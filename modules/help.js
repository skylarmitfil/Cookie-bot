const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    /**
     * Executes when a user triggers the help command
     */
    execute: async (message, prefix) => {
        // Enforce prefix matching (e.g., .help)
        if (!message.content.startsWith(`${prefix}help`)) return;

        try {
            // Construct the clean Crimson Help Embed
            const helpEmbed = new EmbedBuilder()
                .setColor('#DC143C') // Solid Crimson sidebar stripe
                .setAuthor({ name: `${message.client.user.username}'s command list`, iconURL: message.client.user.displayAvatarURL() })
                .setDescription(
                    `[Support server](https://discord.gg/nPej3j4Xh5) | [Bot Wiki](https://discord-cookie.com)\n\n` +
                    `**Main commands:**\n` +
                    `┃ \`${prefix}c hunt\` \`${prefix}c pray\` \`${prefix}c owo\``
                );

            // Send the embed without any components
            await message.channel.send({ 
                embeds: [helpEmbed]
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
