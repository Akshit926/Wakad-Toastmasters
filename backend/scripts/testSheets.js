const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { syncToGoogleSheets } = require('../services/googleSheetsService');

async function testSync() {
    const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    
    console.log('--------------------------------------------------');
    console.log('Toastmasters Google Sheets Sync Test Utility');
    console.log('--------------------------------------------------');
    console.log(`Webhook URL from .env: ${webhookUrl || 'NOT CONFIGURED'}\n`);

    if (!webhookUrl) {
        console.error('ERROR: GOOGLE_SHEETS_WEBHOOK_URL is not set in your .env file.');
        console.log('Please follow the instructions in the implementation plan to set it up.');
        process.exit(1);
    }

    const mockData = {
        full_name: 'Test Member',
        first_name: 'Test',
        last_name: 'Member',
        email: 'test.member@example.com',
        phone: '9876543210',
        birth_date: '1995-05-15',
        source: 'LinkedIn',
        source_other: '',
        photo_url: 'http://localhost:5001/uploads/member-photos/sample-photo.jpg',
        photo_filename: 'sample-photo.jpg',
        introduction: 'Hello! I am a software engineer looking to improve my public speaking and leadership skills.',
        hobbies: 'Reading, hiking, coding, and playing chess.',
        why_join: 'I want to build confidence and network with other professionals.',
        queries: 'Is it possible to attend meetings virtually if I travel?'
    };

    console.log('Sending mock member registration data to Google Sheets...');
    console.log('Mock Data:', JSON.stringify(mockData, null, 2));
    console.log('\n--- Fetch Logs ---');

    try {
        await syncToGoogleSheets(mockData);
        console.log('------------------');
        console.log('\nSUCCESS: Webhook execution complete. Check your Google Sheet to verify if the row was added!');
    } catch (err) {
        console.error('------------------');
        console.error('\nERROR: Sync failed with error:', err.message);
    }
}

testSync();
