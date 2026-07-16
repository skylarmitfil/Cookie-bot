const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
const fs = require('fs').promises;
const path = require('path');

// FIX: Absolute path tracking directly relative to this command file position
const LETTERS_DIR = path.join(__dirname, 'template'); 
const LETTER_WIDTH = 30;  
const LETTER_HEIGHT = 40; 

let referenceCache = null;

async function loadReferenceLetters() {
    if (referenceCache) return referenceCache;
    
    referenceCache = [];
    try {
        const files = await fs.readdir(LETTERS_DIR);
        for (const file of files) {
            if (file.endsWith('.png')) {
                const char = path.basename(file, '.png').toUpperCase();
                const img = await Jimp.read(path.join(LETTERS_DIR, file));
                
                img.resize(LETTER_WIDTH, LETTER_HEIGHT).greyscale().contrast(1).threshold({ max: 150 });
                referenceCache.push({ char, bitmap: img.bitmap });
            }
        }
        console.log(`[CAPTCHA] Successfully loaded ${referenceCache.length} template glyphs.`);
    } catch (err) {
        console.error('[CAPTCHA INIT ERROR]: Cannot load reference folder.', err);
    }
    return referenceCache;
}

module.exports = {
    name: 'captcha',
    async execute(message) {
        const attachment = message.attachments.first();
        if (!attachment || !attachment.contentType?.startsWith('image/')) return;

        console.log(`[CAPTCHA] Intercepted image. Running extraction pipeline...`);

        const replyMessage = await message.reply({
            content: `I detected a CAPTCHA. Scanning letter structures...`,
            allowedMentions: { repliedUser: true }
        });

        try {
            const references = await loadReferenceLetters();
            if (!references || references.length === 0) {
                return await replyMessage.edit(`Error: The template folder at \`${LETTERS_DIR}\` is missing or unreadable.`);
            }

            const captchaImg = await Jimp.read(attachment.url);
            captchaImg.scan(0, 0, captchaImg.bitmap.width, captchaImg.bitmap.height, function(x, y, idx) {
                const red = this.bitmap.data[idx + 0];
                const green = this.bitmap.data[idx + 1];
                const blue = this.bitmap.data[idx + 2];

                if (blue > 130 && red < 120 && green < 190) {
                    this.bitmap.data[idx + 0] = 0;   
                    this.bitmap.data[idx + 1] = 0;
                    this.bitmap.data[idx + 2] = 0;
                } else {
                    this.bitmap.data[idx + 0] = 255; 
                    this.bitmap.data[idx + 1] = 255;
                    this.bitmap.data[idx + 2] = 255;
                }
            });

            const finalCharacters = [];
            const segments = 5; 
            const segmentWidth = Math.floor(captchaImg.bitmap.width / segments);

            for (let i = 0; i < segments; i++) {
                const startX = i * segmentWidth;
                const slice = captchaImg.clone().crop(startX, 0, segmentWidth, captchaImg.bitmap.height);
                slice.resize(LETTER_WIDTH, LETTER_HEIGHT);

                let bestMatchChar = '?';
                let lowestDiffPixels = Infinity;

                for (const ref of references) {
                    const diffBuffer = Buffer.alloc(LETTER_WIDTH * LETTER_HEIGHT * 4);
                    
                    const mismatchedPixels = pixelmatch(
                        slice.bitmap.data,
                        ref.bitmap.data,
                        diffBuffer,
                        LETTER_WIDTH,
                        LETTER_HEIGHT,
                        { threshold: 0.20 } 
                    );

                    if (mismatchedPixels < lowestDiffPixels) {
                        lowestDiffPixels = mismatchedPixels;
                        bestMatchChar = ref.char;
                    }
                }

                if (lowestDiffPixels < (LETTER_WIDTH * LETTER_HEIGHT * 0.85)) {
                    finalCharacters.push(bestMatchChar);
                }
            }

            const finalString = finalCharacters.join('');

            if (finalString && finalString.length > 0) {
                await replyMessage.edit(`\`${finalString}\``);
            } else {
                await replyMessage.edit("Could not accurately compute pixel matches.");
            }
            
        } catch (err) {
            console.error('[CAPTCHA ERROR]:', err);
            await replyMessage.edit("There was an error processing the CAPTCHA.");
        }
    }
};
