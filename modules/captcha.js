const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');
const fs = require('fs').promises;
const path = require('path');

// --- RAILWAY COMPATIBLE ABSOLUTE PATH ---
// Climbs up one folder out of "modules" to locate the "template" directory at the root level
const LETTERS_DIR = path.join(__dirname, '..', 'template'); 
const LETTER_WIDTH = 30;  // Normalization width for template comparisons
const LETTER_HEIGHT = 40; // Normalization height for template comparisons

let referenceCache = null;

// Pre-load reference templates into RAM for fast performance on Railway
async function loadReferenceLetters() {
    if (referenceCache) return referenceCache;
    
    referenceCache = [];
    try {
        const files = await fs.readdir(LETTERS_DIR);
        for (const file of files) {
            if (file.endsWith('.png')) {
                // Extracts the character designation from the filename (e.g., "a.png" -> "A")
                const char = path.basename(file, '.png').toUpperCase();
                const img = await Jimp.read(path.join(LETTERS_DIR, file));
                
                // Format template styles to match the cleaned incoming black & white matrix stream
                img.resize(LETTER_WIDTH, LETTER_HEIGHT).greyscale().contrast(1).threshold({ max: 150 });
                referenceCache.push({ char, bitmap: img.bitmap });
            }
        }
        console.log(`[CAPTCHA] Successfully loaded ${referenceCache.length} templates from root /template folder.`);
    } catch (err) {
        console.error(`[CAPTCHA INIT ERROR]: Could not locate or read template folder at ${LETTERS_DIR}`, err);
    }
    return referenceCache;
}

module.exports = {
    name: 'captcha',
    async execute(message, targetImageUrl) {
        // Safety guard clause in case no valid string URL was captured by index.js
        if (!targetImageUrl) return;

        console.log(`[CAPTCHA] Processing image via Template Matching from ${message.author.tag}`);

        // Send the initialization acknowledgment alert back to the active Discord text channel
        const replyMessage = await message.reply({
            content: `I detected a CAPTCHA embed. Running pixel analysis...`,
            allowedMentions: { repliedUser: true }
        });

        try {
            const references = await loadReferenceLetters();
            if (!references || references.length === 0) {
                return await replyMessage.edit(`Error: The template folder at \`${LETTERS_DIR}\` is missing or unreadable on the server host.`);
            }

            // 1. Download and isolate OwO's signature light-blue color palette from the target URL
            const captchaImg = await Jimp.read(targetImageUrl);
            captchaImg.scan(0, 0, captchaImg.bitmap.width, captchaImg.bitmap.height, function(x, y, idx) {
                const red = this.bitmap.data[idx + 0];
                const green = this.bitmap.data[idx + 1];
                const blue = this.bitmap.data[idx + 2];

                // Isolate OwO's precise text hex spectrum: High blue value, muted red/green elements
                if (blue > 130 && red < 120 && green < 190) {
                    this.bitmap.data[idx + 0] = 0;   // Character glyph boundary lines -> Black
                    this.bitmap.data[idx + 1] = 0;
                    this.bitmap.data[idx + 2] = 0;
                } else {
                    this.bitmap.data[idx + 0] = 255; // Surrounding field elements & noise -> White
                    this.bitmap.data[idx + 1] = 255;
                    this.bitmap.data[idx + 2] = 255;
                }
            });

            // 2. Proportional Matrix Grid Segmentation (Slicing into character blocks)
            const finalCharacters = [];
            const segments = 5; // Split the image into 5 proportional letter slots
            const segmentWidth = Math.floor(captchaImg.bitmap.width / segments);

            for (let i = 0; i < segments; i++) {
                const startX = i * segmentWidth;
                
                // Clone and isolate a singular character window channel slice frame
                const slice = captchaImg.clone().crop(startX, 0, segmentWidth, captchaImg.bitmap.height);
                slice.resize(LETTER_WIDTH, LETTER_HEIGHT); // Enforce rigid template constraints

                let bestMatchChar = '?';
                let lowestDiffPixels = Infinity;

                // 3. Compute pixel mismatch variances against the local lookup dictionary cache
                for (const ref of references) {
                    const diffBuffer = Buffer.alloc(LETTER_WIDTH * LETTER_HEIGHT * 4);
                    
                    const mismatchedPixels = pixelmatch(
                        slice.bitmap.data,
                        ref.bitmap.data,
                        diffBuffer,
                        LETTER_WIDTH,
                        LETTER_HEIGHT,
                        { threshold: 0.20 } // Sensitivity offset configuration
                    );

                    // Track the character that reports the absolute cleanest canvas resemblance
                    if (mismatchedPixels < lowestDiffPixels) {
                        lowestDiffPixels = mismatchedPixels;
                        bestMatchChar = ref.char;
                    }
                }

                // If pixel divergence passes continuity verification tests, accept structural value
                if (lowestDiffPixels < (LETTER_WIDTH * LETTER_HEIGHT * 0.85)) {
                    finalCharacters.push(bestMatchChar);
                }
            }

            const finalString = finalCharacters.join('');

            // 4. Print output code layout safely wrapped within backticks syntax blocks
            if (finalString && finalString.length > 0) {
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
