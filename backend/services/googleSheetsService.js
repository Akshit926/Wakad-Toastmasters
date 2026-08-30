// backend/services/googleSheetsService.js
// Handles syncing member registration data to Google Sheets via Apps Script Web App Webhook

/**
 * Sends registered member details to Google Sheets
 * @param {Object} memberDetails - Member details submitted via the registration form
 */
async function syncToGoogleSheets(memberDetails) {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    
    if (!webhookUrl) {
        console.log('[Google Sheets] Webhook URL not configured in .env. Skipping sync.');
        return;
    }

    let photoBase64 = null;
    let photoMimeType = null;

    if (memberDetails.photo_filename) {
        try {
            const fs = require('fs');
            const path = require('path');
            const os = require('os');
            const filePath = process.env.RENDER
                ? path.join(os.tmpdir(), 'member-photos', memberDetails.photo_filename)
                : path.join(__dirname, '..', 'uploads', 'member-photos', memberDetails.photo_filename);

            if (fs.existsSync(filePath)) {
                photoBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
                const ext = path.extname(filePath).toLowerCase();
                if (ext === '.png') photoMimeType = 'image/png';
                else if (ext === '.webp') photoMimeType = 'image/webp';
                else photoMimeType = 'image/jpeg';
            }
        } catch (err) {
            console.error('[Google Sheets] Failed to read photo file for base64 encoding:', err.message);
        }
    }

    try {
        console.log('[Google Sheets] Syncing new member registration details with photo attachment...');
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString(),
                ...memberDetails,
                photo_base64: photoBase64,
                photo_mime_type: photoMimeType
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        console.log('[Google Sheets] Sync successful. Response:', text);
    } catch (error) {
        console.error('[Google Sheets] Sync failed:', error.message);
        // We log the error but do not throw it to ensure the core signup flow 
        // remains successful even if the Google Sheets sync fails temporarily.
    }
}

module.exports = { syncToGoogleSheets };
