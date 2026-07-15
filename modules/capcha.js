const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'captcha',
    async execute(message) {
        if (message.attachments.size === 0) return;
        
        const attachment = message.attachments.first();
        if (!attachment.contentType?.startsWith('image/')) return;

        try {
            // Load the CAPTCHA image
            const captchaImg = await Jimp.read(attachment.url);
            
            // NOTE: You would add logic here to crop the image into 
            // individual letters (e.g., using captchaImg.crop())
            
            const results = await solve(captchaImg);
            message.reply(`Detected code: \`${results}\``);
        } catch (err) {
            console.error(err);
        }
    }
};

async function solve(captchaImg) {
    const templateDir = path.join(__dirname, '../templates');
    const files = fs.readdirSync(templateDir);
    let detectedText = '';

    // Simplified: Compare the whole CAPTCHA image to templates 
    // (Ideally, loop through each cropped letter)
    for (const file of files) {
        const template = await Jimp.read(path.join(templateDir, file));
        // distance 0 is a perfect match
        const distance = Jimp.distance(captchaImg, template);
        
        if (distance < 0.1) { // Threshold for match
            detectedText += file.replace('.png', '');
        }
    }
    return detectedText;
}
