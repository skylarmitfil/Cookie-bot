const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
const fs = require('fs');
const path = require('path');

const templates = [];
const templateDir = path.join(__dirname, '../template');

// Load templates once on startup
if (fs.existsSync(templateDir)) {
    fs.readdirSync(templateDir).filter(f => f.endsWith('.png')).forEach(async (file) => {
        const img = await Jimp.read(path.join(templateDir, file));
        img.greyscale().resize(32, 32);
        templates.push({ name: file.replace('.png', ''), data: img.bitmap.data });
    });
}

module.exports = {
    name: 'captcha',
    async execute(message) {
        const attachment = message.attachments.first();
        if (!attachment) return;

        try {
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

            // Reply directly to the author in the same channel
            await message.reply({
                content: `The detected code is: \`${detectedText}\``,
                allowedMentions: { repliedUser: true }
            });

        } catch (err) {
            console.error('[CAPTCHA PROCESSING ERROR]:', err);
            await message.reply("I couldn't process that CAPTCHA image.");
        }
    }
};
