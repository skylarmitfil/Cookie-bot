const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'captcha',
    async execute(message) {
        // Ignore messages without attachments
        if (message.attachments.size === 0) return;
        
        const attachment = message.attachments.first();
        
        // Ensure the attachment is an image
        if (!attachment.contentType?.startsWith('image/')) return;

        try {
            // Read the incoming CAPTCHA image
            const captchaImg = await Jimp.read(attachment.url);
            
            // Define the path to your 'template' folder
            const templateDir = path.join(__dirname, '../template');
            
            // Read all files in the template directory
            const templateFiles = fs.readdirSync(templateDir);
            
            // Assuming the CAPTCHA always has exactly 5 letters
            const charWidth = Math.floor(captchaImg.bitmap.width / 5);
            let detectedText = '';

            // Loop 5 times to crop and check each letter side-by-side
            for (let i = 0; i < 5; i++) {
                // Crop out the single letter
                const letterImg = captchaImg.clone().crop(i * charWidth, 0, charWidth, captchaImg.bitmap.height);
                
                let bestMatch = { name: '?', distance: Infinity };

                // Compare the cropped letter against every template file you uploaded
                for (const file of templateFiles) {
                    // Skip any non-image files (like .gitkeep or other hidden files)
                    if (!file.endsWith('.png')) continue;

                    const template = await Jimp.read(path.join(templateDir, file));
                    const distance = Jimp.distance(letterImg, template);
                    
                    // A lower distance means the pixels are a closer match
                    if (distance < bestMatch.distance) {
                        bestMatch = { name: file.replace('.png', ''), distance };
                    }
                }
                // Add the best matched letter to the final string
                detectedText += bestMatch.name;
            }
            
            // Send the final detected 5-letter code to the channel with the requested format
            message.channel.send(`The code is \`${detectedText}\``);
            
        } catch (err) {
            console.error('CAPTCHA Solver Error:', err);
        }
    }
};
