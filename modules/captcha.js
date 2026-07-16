const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
const fs = require('fs').promises;
const path = require('path');

// --- PATH CONFIGURATION ---
// This looks for a folder named "template" located in your project's root folder
const LETTERS_DIR = path.join(process.cwd(), 'template'); 
const LETTER_WIDTH = 30;  // Adjust to match your template width if needed
const LETTER_HEIGHT = 40; // Adjust to match your template height if needed

let referenceCache = null;

// Pre-load reference templates into RAM for fast performance on Railway
async function loadReferenceLetters() {
    if (referenceCache) return referenceCache;
    
    referenceCache = [];
    try {
        const files = await fs.readdir(LETTERS_DIR);
        for (const file of files) {
            if (file.endsWith('.png')) {
                // Extracts the character name from the filename (e.g., "a.png" becomes "A")
                const char = path.basename(file, '.png').toUpperCase();
                const img = await Jimp.read(path.join(LETTERS_DIR, file));
                
                // Normalize reference styles to match the cleaned incoming stream
                img.resize(LETTER_WIDTH, LETTER_HEIGHT).greyscale().contrast(1).threshold({ max: 150 });
                referenceCache.push({ char, bitmap: img.bitmap });
            }
        }
        console.log(`[CAPTCHA] Successfully loaded ${referenceCache.length} templates from /template folder.`);
    } catch (err) {
        console.error('[CAPTCHA INIT ERROR]: Make sure your "template" folder exists at the project root.', err);
    }
    return referenceCache;
}

module.exports = {
    name: 'captcha',
    async execute(message) {
        const attachment = message.attachments.first();
        if (!attachment || !attachment.contentType?.startsWith('image/')) return;

        console.log(`[CAPTCHA] Processing via Template Matching from ${message.author.tag}`);

        const replyMessage = await message.reply({
            content: `I detected a CAPTCHA. Running pixel analysis...`,
            allowedMentions: { repliedUser: true }
        });

        try {
            const references = await loadReferenceLetters();
            if (!references || references.length === 0) {
                return await replyMessage.edit("Error: The 'template' folder is missing or contains no .png files.");
            }

            // 1. Download and isolate OwO's signature light-blue color palette
            const captchaImg = await Jimp.read(attachment.url);
            captchaImg.scan(0, 0, captchaImg.bitmap.width, captchaImg.bitmap.height, function(x, y, idx) {
                const red = this.bitmap.data[idx + 0];
                const green = this.bitmap.data[idx + 1];
                const blue = this.bitmap.data[idx + 2];

                if (blue > 130 && red < 120 && green < 190) {
                    this.bitmap.data[idx + 0] = 0;   // Turn letters pure black
                    this.bitmap.data[idx + 1] = 0;
                    this.bitmap.data[idx + 2] = 0;
                } else {
                    this.bitmap.data[idx + 0] = 255; // Turn background pure white
                    this.bitmap.data[idx + 1] = 255;
                    this.bitmap.data[idx + 2] = 255;
                }
            });

            // 2. Horizontally slice the image container matrix into letters
            const finalCharacters = [];
            const segments = 5; // Tracks the 5 character layout slots
            const segmentWidth = Math.floor(captchaImg.bitmap.width / segments);

            for (let i = 0; i < segments; i++) {
                const startX = i * segmentWidth;
                const slice = captchaImg.clone().crop(startX, 0, segmentWidth, captchaImg.bitmap.height);
                slice.resize(LETTER_WIDTH, LETTER_HEIGHT);

                let bestMatchChar = '?';
                let lowestDiffPixels = Infinity;

                // 3. Compute pixel mismatch thresholds against your cached local dictionary
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

                // Verify the matched shape holds strong continuity structural properties
                if (lowestDiffPixels < (LETTER_WIDTH * LETTER_HEIGHT * 0.75)) {
                    finalCharacters.push(bestMatchChar);
                }
            }

            const finalString = finalCharacters.join('');

            // 4. Edit the notification tracking instance with the code wrap text block
            if (finalString) {
                await replyMessage.edit(`\`${finalString}\``);
            } else {
                await replyMessage.edit("Failed to match the pixel structures against the local templates.");
            }
            
        } catch (err) {
            console.error('[CAPTCHA ERROR]:', err);
            await replyMessage.edit("There was an error processing the CAPTCHA.");
        }
    }
};
