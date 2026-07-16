const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const templateDir = path.join(__dirname, '../template');
const templates = [];

async function initTemplates() {
    if (!fs.existsSync(templateDir)) return;
    const files = fs.readdirSync(templateDir).filter(f => f.endsWith('.png'));
    for (const file of files) {
        const img = await Jimp.read(path.join(templateDir, file));
        img.grayscale().resize(32, 32);
        templates.push({ name: file.replace('.png', ''), img });
    }
    console.log(`[INIT] Loaded ${templates.length} templates.`);
}

module.exports = {
    name: 'captcha',
    init: initTemplates,
    async execute(message) {
        const attachment = message.attachments.find(a => a.contentType?.startsWith('image/'));
        if (!attachment) return;

        try {
            const captchaImg = await Jimp.read(attachment.url);
            captchaImg.grayscale();
            
            const charWidth = Math.floor(captchaImg.bitmap.width / 5);
            let detectedText = '';

            for (let i = 0; i < 5; i++) {
                const letterImg = captchaImg.clone()
                    .crop(i * charWidth, 0, charWidth, captchaImg.bitmap.height)
                    .resize(32, 32);

                let bestMatch = { name: '?', distance: Infinity };
                for (const t of templates) {
                    const dist = Jimp.distance(letterImg, t.img);
                    if (dist < bestMatch.distance) {
                        bestMatch = { name: t.name, distance: dist };
                    }
                }
                detectedText += bestMatch.name;
            }
            
            message.reply(`The code is \`${detectedText}\``);
        } catch (err) {
            console.error('[CAPTCHA ERROR]:', err);
        }
    }
};
