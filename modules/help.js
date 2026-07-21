const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    // Updated parameters to match your index.js structure
    execute: async (message, args) => {
        try {
            // Using the '.' prefix as you established
            const prefix = '.'; 
            
            const helpEmbed = new EmbedBuilder()
                .setColor('#DC143C') 
                .setAuthor({ 
                    name: `${message.client.user.username}'s command list`, 
                    iconURL: message.client.user.displayAvatarURL() 
                })
                .setDescription(
                    `[Support server]() | [Bot Wiki](https://discord-cookie.com)\n\n` +
                    `**Main commands:**\n` +
                    `┃ \`${prefix}c hunt\` \`${prefix}c pray\` \`${prefix}c owo\``
                );

            await message.channel.send({ embeds: [helpEmbed] });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
