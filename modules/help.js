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
            // 1. Construct the clean Crimson Help Embed
            const helpEmbed = new EmbedBuilder()
                .setColor('#DC143C') // Solid Crimson sidebar stripe
                .setAuthor({ 
                    name: `${message.client.user.username}'s command list`, 
                    iconURL: message.client.user.displayAvatarURL()
                })
                .setDescription(
                    `Use \`${prefix}help {command}\` for more help.\n` +
                    `📢 **Check our latest bot updates:** \`${prefix}news\`\n` +
                    `[Support server](https://discord.gg) | [Bot Wiki](https://discord-cookie.com) | [Donate](https://example.com)\n\n` +
                    `**Main commands:**\n` +
                    `┃ \`${prefix}hunt\` \`${prefix}pray\` \`${prefix}owo\``
                );

            // 2. Send only the embed package without any components array attached
            await message.channel.send({
                embeds: [helpEmbed]
            });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
