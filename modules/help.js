const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',

    execute: async (message, args) => {
        try {
            const prefix = '.'; 
            
            const helpEmbed = new EmbedBuilder()
                .setColor('#DC143C') 
                .setAuthor({ 
                    name: `${message.client.user.username}'s command list`, 
                    iconURL: message.client.user.displayAvatarURL() 
                })
                .setDescription(
                    `[Bot Website](https://discord-cookie.com)\n\n` +
                    `**Main Commands:**\n` +
                    `┃ \`${prefix}c hunt\` \`${prefix}c battle\` \`${prefix}c pray\` \`${prefix}c curse\` \`${prefix}c owo\`\n\n` +
                    `**Goal Tracking:**\n` +
                    `┃ \`${prefix}goal\` — View your current progress and goals\n\n` +
                    `**Custom Reminders:**\n` +
                    `┃ \`${prefix}reminder\` — View reminder settings & active alerts\n` +
                    `┃ \`${prefix}reminder msg <hb/pc/owo> <text>\` — Set custom alert text\n` +
                    `┃ \`${prefix}reminder reset <hb/pc/owo/all>\` — Reset custom alert text`
                );

            await message.channel.send({ embeds: [helpEmbed] });

        } catch (error) {
            console.error('[HELP COMMAND ERROR]', error);
        }
    }
};
