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

    try {
        console.log('[Google Sheets] Syncing new member registration details...');
        
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                timestamp: new Date().toISOString(),
                ...memberDetails
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
