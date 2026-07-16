const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
const fs = require('fs');
const path = require('path');

const templateDir = path.join(__dirname, '../template');
const templates = [];

async function initTemplates() {
    if (!fs.existsSync(templateDir)) return;
    const files = fs.readdirSync(templateDir).filter(f => f.endsWith('.png'));
    for (const file of files) {
        // Load, grayscale, and resize for consistency
        const img = await Jimp.read(path.join(templateDir, file));
        img.greyscale().resize(32, 32);
        templates.push({ name: file.replace('.png', ''), data: img.bitmap.data });
    }
    console.log(`[INIT] Loaded ${templates.length} templates for matching.`);
}

module.exports = {
    name: 'captcha',
    init: initTemplates,
    async execute(message) {
        const attachment = message.attachments.find(a => a.contentType?.startsWith('image/'));
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
                    // pixelmatch returns the number of differing pixels
                    // We create a dummy buffer for the output (not needed here)
                    const diff = new Uint8Array(32 * 32 * 4);
                    const score = pixelmatch(
                        letterImg.bitmap.data, 
                        t.data, 
                        diff, 
                        32, 32, 
                        { threshold: 0.2 } // Adjust this 0.1 - 0.4 if needed
                    );
                    
                    if (score < bestMatch.score) {
                        bestMatch = { name: t.name, score };
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
