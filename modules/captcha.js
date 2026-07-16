const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
const fs = require('fs').promises;
const path = require('path');

// --- RAILWAY COMPATIBLE ABSOLUTE PATH ---
// Points straight to the "template" directory in your root folder
const LETTERS_DIR = path.resolve(process.cwd(), 'template'); 
const LETTER_WIDTH = 30;  
const LETTER_HEIGHT = 40; 

let referenceCache = null;

// Pre-load reference templates into RAM for high performance
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
        console.log(`[CAPTCHA] Successfully loaded ${referenceCache.length} template glyphs into memory.`);
    } catch (err) {
        console.error('[CAPTCHA INIT ERROR]: Check that your folder is named lowercase "template" at the root.', err);
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
                return await replyMessage.edit("Error: The 'template' folder could not be found or read on the host server.");
            }

            // 1. Download and isolate OwO's light-blue color palette
            const captchaImg = await Jimp.read(attachment.url);
            captchaImg.scan(0, 0, captchaImg.bitmap.width, captchaImg.bitmap.height, function(x, y, idx) {
                const red = this.bitmap.data[idx + 0];
                const green = this.bitmap.data[idx + 1];
                const blue = this.bitmap.data[idx + 2];

                if (blue > 130 && red < 120 && green < 190) {
                    this.bitmap.data[idx + 0] = 0;   // Letters -> Pure Black
                    this.bitmap.data[idx + 1] = 0;
                    this.bitmap.data[idx + 2] = 0;
                } else {
                    this.bitmap.data[idx + 0] = 255; // Background -> Pure White
                    this.bitmap.data[idx + 1] = 255;
                    this.bitmap.data[idx + 2] = 255;
                }
            });

            // 2. FIXED SLICING FOR WAVE CAPTCHAS: Use 5 proportional slices
            // When horizontal waves connect characters, dynamic pixel trackers fail. 
            // Proportional grids break the wave line across 5 slots instead.
            const finalCharacters = [];
            const segments = 5; 
            const segmentWidth = Math.floor(captchaImg.bitmap.width / segments);

            for (let i = 0; i < segments; i++) {
                const startX = i * segmentWidth;
                const slice = captchaImg.clone().crop(startX, 0, segmentWidth, captchaImg.bitmap.height);
                slice.resize(LETTER_WIDTH, LETTER_HEIGHT);

                let bestMatchChar = '?';
                let lowestDiffPixels = Infinity;

                // 3. Run template matching on the current segment slot
                for (const ref of references) {
                    const diffBuffer = Buffer.alloc(LETTER_WIDTH * LETTER_HEIGHT * 4);
                    
                    const mismatchedPixels = pixelmatch(
                        slice.bitmap.data,
                        ref.bitmap.data,
                        diffBuffer,
                        LETTER_WIDTH,
                        LETTER_HEIGHT,
                        { threshold: 0.20 } // Loosened threshold matching to bypass overlapping line noise
                    );

                    if (mismatchedPixels < lowestDiffPixels) {
                        lowestDiffPixels = mismatchedPixels;
                        bestMatchChar = ref.char;
                    }
                }

                // If a decent match structure is found, collect it
                if (lowestDiffPixels < (LETTER_WIDTH * LETTER_HEIGHT * 0.85)) {
                    finalCharacters.push(bestMatchChar);
                }
            }

            const finalString = finalCharacters.join('');

            // 4. Update the active notification message container with code brackets
            if (finalString && finalString.length > 0) {
                await replyMessage.edit(`\`${finalString}\``);
            } else {
                await replyMessage.edit("Could not accurately compute pixel matches against the alphabet template index.");
            }
            
        } catch (err) {
            console.error('[CAPTCHA ERROR]:', err);
            await replyMessage.edit("There was an error processing the CAPTCHA.");
        }
    }
};
