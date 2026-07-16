const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
const fs = require('fs');
const path = require('path');

const templateDir = path.join(__dirname, '../template');
const templates = [];

// Load your character templates once on startup
async function initTemplates() {
    if (!fs.existsSync(templateDir)) return;
    const files = fs.readdirSync(templateDir).filter(f => f.endsWith('.png'));
    for (const file of files) {
        const img = await Jimp.read(path.join(templateDir, file));
        img.greyscale().resize(32, 32);
        templates.push({ name: file.replace('.png', ''), data: img.bitmap.data });
    }
}

module.exports = {
    name: 'captcha',
    init: initTemplates,
    async execute(message) {
        const attachment = message.attachments.first();
        if (!attachment) return;

        try {
            // 1. Attempt Automated Solve
            const captchaImg = await Jimp.read(attachment.url);
            captchaImg.greyscale();
            
            const charWidth = Math.floor(captchaImg.bitmap.width / 5);
            let detectedText = '';

            for (let i = 0; i < 5; i++) {
                const letterImg = captchaImg.clone()
                    .crop(i * charWidth, 0, charWidth, captchaImg.bitmap.height)
                    .resize(32, 32);

                let bestMatch = { name: '?', score: Infinity };
                for (const t of templates) {
                    const diff = new Uint8Array(32 * 32 * 4);
                    const score = pixelmatch(letterImg.bitmap.data, t.data, diff, 32, 32, { threshold: 0.2 });
                    if (score < bestMatch.score) bestMatch = { name: t.name, score };
                }
                detectedText += bestMatch.name;
            }

            // 2. Logic: If confidence is low (too many '?'), trigger Manual Fallback
            if (detectedText.includes('?')) {
                throw new Error('Low confidence match');
            }

            // If confident, send the command automatically
            message.channel.send(`owo autohunt ${detectedText}`);

        } catch (err) {
            // 3. Manual Fallback: DM the user if automated solve fails
            const user = await message.client.users.fetch(process.env.MY_DISCORD_ID);
            await user.send({
                content: `🚨 **Auto-Solve Failed!**\nServer: ${message.guild.name}\nChannel: <#${message.channel.id}>\n**REPLY FORMAT: \`${message.channel.id}:YOUR_ANSWER\`**`,
                files: [attachment.url]
            });

            global.activeCaptchas.set(message.channel.id, {
                channelId: message.channel.id,
                guildId: message.guild.id
            });
        }
    }
};
