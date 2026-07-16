const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
const fs = require('fs').promises;
const path = require('path');

// Configuration Constants
const LETTERS_DIR = path.join(__dirname, '../letters'); // Point to your folder of reference letters
const LETTER_WIDTH = 30;  // Match the width of your template images
const LETTER_HEIGHT = 40; // Match the height of your template images

let referenceCache = null;

// Pre-load reference letters into memory once for high performance on Railway
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
        console.log(`[CAPTCHA] Loaded ${referenceCache.length} reference letters.`);
    } catch (err) {
        console.error('[CAPTCHA INIT ERROR]:', err);
    }
    return referenceCache;
}

module.exports = {
    name: 'captcha',
    async execute(message) {
        const attachment = message.attachments.first();
        if (!attachment || !attachment.contentType?.startsWith('image/')) return;

        console.log(`[CAPTCHA] Processing via Pixelmatch from ${message.author.tag}`);

        const replyMessage = await message.reply({
            content: `I detected a CAPTCHA. Running pixel analysis...`,
            allowedMentions: { repliedUser: true }
        });

        try {
            const references = await loadReferenceLetters();
            if (!references || references.length === 0) {
                return await replyMessage.edit("Error: Reference letters folder is missing or empty.");
            }

            // 1. Download and mask the image to isolate the blue pixels
            const captchaImg = await Jimp.read(attachment.url);
            captchaImg.scan(0, 0, captchaImg.bitmap.width, captchaImg.bitmap.height, function(x, y, idx) {
                const red = this.bitmap.data[idx + 0];
                const green = this.bitmap.data[idx + 1];
                const blue = this.bitmap.data[idx + 2];

                if (blue > 130 && red < 120 && green < 190) {
                    this.bitmap.data[idx + 0] = 0;   // Black text
                    this.bitmap.data[idx + 1] = 0;
                    this.bitmap.data[idx + 2] = 0;
                } else {
                    this.bitmap.data[idx + 0] = 255; // White background
                    this.bitmap.data[idx + 1] = 255;
                    this.bitmap.data[idx + 2] = 255;
                }
            });

            // 2. Segment the image into letter blocks
            // Based on your image, OwO usually spits out 5 characters split across 2 words (e.g. 3 letters + 2 letters)
            const finalCharacters = [];
            const segments = 5; 
            const segmentWidth = Math.floor(captchaImg.bitmap.width / segments);

            for (let i = 0; i < segments; i++) {
                const startX = i * segmentWidth;
                const slice = captchaImg.clone().crop(startX, 0, segmentWidth, captchaImg.bitmap.height);
                slice.resize(LETTER_WIDTH, LETTER_HEIGHT);

                let bestMatchChar = '?';
                let lowestDiffPixels = Infinity;

                // 3. Match the current segment slice directly against your saved alphabet images
                for (const ref of references) {
                    const diffBuffer = Buffer.alloc(LETTER_WIDTH * LETTER_HEIGHT * 4);
                    
                    const mismatchedPixels = pixelmatch(
                        slice.bitmap.data,
                        ref.bitmap.data,
                        diffBuffer,
                        LETTER_WIDTH,
                        LETTER_HEIGHT,
                        { threshold: 0.1 }
                    );

                    if (mismatchedPixels < lowestDiffPixels) {
                        lowestDiffPixels = mismatchedPixels;
                        bestMatchChar = ref.char;
                    }
                }

                if (lowestDiffPixels < (LETTER_WIDTH * LETTER_HEIGHT * 0.75)) {
                    finalCharacters.push(bestMatchChar);
                }
            }

            const finalString = finalCharacters.join('');

            // 4. Respond with the clean code wrapped in code brackets
            if (finalString) {
                await replyMessage.edit(`\`${finalString}\``);
            } else {
                await replyMessage.edit("Failed to match the pixel structures against local templates.");
            }
            
        } catch (err) {
            console.error('[CAPTCHA ERROR]:', err);
            await replyMessage.edit("There was an error processing the CAPTCHA.");
        }
    }
};
