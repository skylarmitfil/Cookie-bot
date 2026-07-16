const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
const fs = require('fs').promises;
const path = require('path');

// --- PATH CONFIGURATION ---
const LETTERS_DIR = path.join(process.cwd(), 'template'); 
const LETTER_WIDTH = 30;  
const LETTER_HEIGHT = 40; 

let referenceCache = null;

// Pre-load reference templates into RAM
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
        console.log(`[CAPTCHA] Loaded ${referenceCache.length} templates from /template folder.`);
    } catch (err) {
        console.error('[CAPTCHA INIT ERROR]: Make sure "template" folder is at project root.', err);
    }
    return referenceCache;
}

module.exports = {
    name: 'captcha',
    async execute(message) {
        const attachment = message.attachments.first();
        if (!attachment || !attachment.contentType?.startsWith('image/')) return;

        console.log(`[CAPTCHA] Processing via Dynamic Pixelmatch from ${message.author.tag}`);

        const replyMessage = await message.reply({
            content: `I detected a CAPTCHA. Scanning letter positions...`,
            allowedMentions: { repliedUser: true }
        });

        try {
            const references = await loadReferenceLetters();
            if (!references || references.length === 0) {
                return await replyMessage.edit("Error: The 'template' folder is missing or empty.");
            }

            // 1. Download and isolate OwO's light-blue text color spectrum
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

            // 2. DYNAMIC SEGMENTATION: Find exactly where letters start and end
            const width = captchaImg.bitmap.width;
            const height = captchaImg.bitmap.height;
            const hasBlackPixel = new Array(width).fill(false);

            // Scan every column from top to bottom to check if it contains text pixels
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    const idx = (y * width + x) * 4;
                    if (captchaImg.bitmap.data[idx] === 0) { // Found a black pixel
                        hasBlackPixel[x] = true;
                        break;
                    }
                }
            }

            // Group the active columns together into bounding box coordinate pairs
            const bounds = [];
            let inLetter = false;
            let startX = 0;

            for (let x = 0; x < width; x++) {
                if (hasBlackPixel[x] && !inLetter) {
                    inLetter = true;
                    startX = x;
                } else if (!hasBlackPixel[x] && inLetter) {
                    inLetter = false;
                    // Ignore tiny vertical speckles or isolated noise lines under 5 pixels wide
                    if (x - startX > 5) {
                        bounds.push({ startX, width: x - startX });
                    }
                }
            }
            // Catch a letter that touches the very right edge of the image container
            if (inLetter && (width - startX > 5)) {
                bounds.push({ startX, width: width - startX });
            }

            // 3. PIXEL MATCHING ON DYNAMIC CROPS
            const finalCharacters = [];

            for (const bound of bounds) {
                // Crop the exact boundary box of the character
                const slice = captchaImg.clone().crop(bound.startX, 0, bound.width, height);
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
                        { threshold: 0.15 } // Increased threshold tolerance for distorted shapes
                    );

                    if (mismatchedPixels < lowestDiffPixels) {
                        lowestDiffPixels = mismatchedPixels;
                        bestMatchChar = ref.char;
                    }
                }

                // If the pixel mismatch is low enough, accept the letter match
                if (lowestDiffPixels < (LETTER_WIDTH * LETTER_HEIGHT * 0.80)) {
                    finalCharacters.push(bestMatchChar);
                }
            }

            const finalString = finalCharacters.join('');

            // 4. Send the cleaned code back inside backticks
            if (finalString && finalString.length > 0) {
                await replyMessage.edit(`\`${finalString}\``);
            } else {
                await replyMessage.edit("Failed to isolate character structures cleanly. Template mismatch.");
            }
            
        } catch (err) {
            console.error('[CAPTCHA ERROR]:', err);
            await replyMessage.edit("There was an error processing the CAPTCHA.");
        }
    }
};
