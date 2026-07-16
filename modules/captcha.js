const Jimp = require('jimp');
const { createWorker } = require('tesseract.js');

module.exports = {
    name: 'captcha',
    async execute(message) {
        const attachment = message.attachments.first();
        if (!attachment) return;

        // Ensure we are only processing images
        if (!attachment.contentType?.startsWith('image/')) return;

        console.log(`[CAPTCHA] Processing OwO image from ${message.author.tag}`);

        // Send an initial reply and track it so we can edit it later
        const replyMessage = await message.reply({
            content: `I detected an OwO CAPTCHA image. Deciphering characters...`,
            allowedMentions: { repliedUser: true }
        });

        try {
            // 1. Download the CAPTCHA image into memory using Jimp
            const captchaImg = await Jimp.read(attachment.url);
            
            // 2. Custom Color Masking: Isolate the specific blue spectrum of OwO text
            captchaImg.scan(0, 0, captchaImg.bitmap.width, captchaImg.bitmap.height, function(x, y, idx) {
                const red = this.bitmap.data[idx + 0];
                const green = this.bitmap.data[idx + 1];
                const blue = this.bitmap.data[idx + 2];

                // Target OwO's signature light-blue color range:
                // High blue values combined with lower red and moderate green values
                if (blue > 130 && red < 120 && green < 190) {
                    // Turn the matching blue characters pure black for sharp text tracing
                    this.bitmap.data[idx + 0] = 0;   // R
                    this.bitmap.data[idx + 1] = 0;   // G
                    this.bitmap.data[idx + 2] = 0;   // B
                } else {
                    // Force the dark/purple background and non-matching pixels to pure white
                    this.bitmap.data[idx + 0] = 255; // R
                    this.bitmap.data[idx + 1] = 255; // G
                    this.bitmap.data[idx + 2] = 255; // B
                }
            });

            // 3. Scale up the clean black-and-white mask so Tesseract can map the distorted glyphs
            captchaImg.scale(3);

            // 4. Convert the Jimp image buffer directly into memory for Tesseract.js processing
            const processedBuffer = await captchaImg.getBufferAsync(Jimp.MIME_PNG);
            
            // 5. Initialize the local Tesseract engine worker
            const worker = await createWorker('eng');

            // 6. Tesseract Configuration Optimization
            await worker.setParameters({
                // Restrict output to the character set used by OwO (usually lowercase + numbers)
                tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyz0123456789',
                // PSM 7: Treats the entire image grid as a single horizontal line of text
                tessedit_pageseg_mode: '7', 
            });

            // 7. Execute character recognition on our isolated image buffer
            const { data: { text } } = await worker.recognize(processedBuffer);
            
            // Explicitly terminate the engine worker to prevent heavy memory leaks on Railway
            await worker.terminate();

            // 8. Clean up formatting whitespace and normalize output to uppercase
            const finalResult = text.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();

            // 9. Update the initial Discord bot response with the final string output
            if (finalResult && finalResult.length > 0) {
                await replyMessage.edit(`**Decrypted CAPTCHA Code:** \`${finalResult}\``);
            } else {
                await replyMessage.edit("Could not isolate character structures cleanly. Please try generating a new one.");
            }
            
        } catch (err) {
            console.error('[CAPTCHA ERROR]:', err);
            await replyMessage.edit("There was an internal error extracting the text data.");
        }
    }
};
