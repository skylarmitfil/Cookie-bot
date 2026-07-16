const Jimp = require('jimp');
const { createWorker } = require('tesseract.js');

module.exports = {
    name: 'captcha',
    async execute(message) {
        const attachment = message.attachments.first();
        if (!attachment) return;

        // Ensure we are only processing images
        if (!attachment.contentType?.startsWith('image/')) return;

        console.log(`[CAPTCHA] Processing image from ${message.author.tag}`);

        // Send an initial reply and keep a reference to it so we can edit it later
        const replyMessage = await message.reply({
            content: `I detected a CAPTCHA. Processing...`,
            allowedMentions: { repliedUser: true }
        });

        try {
            // 1. Download the CAPTCHA image using Jimp
            const captchaImg = await Jimp.read(attachment.url);
            
            // 2. Process image to break up distortion lines and highlight the letters
            captchaImg
                .scale(2)        // Scales up the image grid to improve OCR clarity
                .greyscale()     // Drops color noise
                .contrast(0.8)   // Pushes colors apart to isolate darker characters
                .threshold({ max: 150 }); // Forces thin crossing lines to dissolve to white

            // 3. Convert the Jimp image buffer directly into memory for Tesseract
            const processedBuffer = await captchaImg.getBufferAsync(Jimp.MIME_PNG);
            
            // 4. Fire up the local Tesseract OCR engine worker
            const worker = await createWorker('eng');

            // 5. Restrict the character scanner to alphanumeric only and treat as 1 line
            await worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
                tessedit_pageseg_mode: '7', // PSM 7: Treats image as a single text line
            });

            // 6. Extract the text matrix
            const { data: { text } } = await worker.recognize(processedBuffer);
            
            // Kill the worker to prevent local system memory leaks
            await worker.terminate();

            // 7. Clean formatting and normalize to uppercase
            const finalResult = text.trim().toUpperCase();

            // 8. Update the initial bot reply with the text payload
            if (finalResult) {
                await replyMessage.edit(`**Result:** \`${finalResult}\``);
            } else {
                await replyMessage.edit("Could not accurately decipher any letters in the image grid.");
            }
            
        } catch (err) {
            console.error('[CAPTCHA ERROR]:', err);
            await replyMessage.edit("There was an error processing the CAPTCHA image.");
        }
    }
};
