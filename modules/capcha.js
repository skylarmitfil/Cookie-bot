const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

// 1. PRE-LOAD TEMPLATES (Outside the execute function)
const templateDir = path.join(__dirname, '../template');
const templates = [];

async function loadTemplates() {
    const files = fs.readdirSync(templateDir).filter(f => f.endsWith('.png'));
    for (const file of files) {
        const img = await Jimp.read(path.join(templateDir, file));
        // Resize to a standard comparison size
        img.resize(32, 32); 
        templates.push({ name: file.replace('.png', ''), img });
    }
}
loadTemplates(); // Call this on startup

module.exports = {
    name: 'captcha',
    async execute(message) {
        if (message.attachments.size === 0) return;
        const attachment = message.attachments.first();
        if (!attachment.contentType?.startsWith('image/')) return;

        try {
            const captchaImg = await Jimp.read(attachment.url);
            const charWidth = Math.floor(captchaImg.bitmap.width / 5);
            let detectedText = '';

            for (let i = 0; i < 5; i++) {
                // Crop and standardize
                const letterImg = captchaImg.clone()
                    .crop(i * charWidth, 0, charWidth, captchaImg.bitmap.height)
                    .resize(32, 32); 

                let bestMatch = { name: '?', distance: Infinity };

                for (const t of templates) {
                    // Use a distance algorithm (or pixelmatch)
                    const dist = Jimp.distance(letterImg, t.img);
                    if (dist < bestMatch.distance) {
                        bestMatch = { name: t.name, distance: dist };
                    }
                }
                detectedText += bestMatch.name;
            }
            message.channel.send(`The code is \`${detectedText}\``);
        } catch (err) {
            console.error(err);
        }
    }
};
