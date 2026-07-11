const db = require('../config/db');
const { sendMemberNotificationEmail } = require('../services/emailService');
const { syncToGoogleSheets } = require('../services/googleSheetsService');

exports.registerMember = async (req, res) => {
    const { first_name, last_name, email, phone, introduction, why_join, source, preferred_role, queries } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO members (first_name, last_name, email, phone, introduction, why_join, source, preferred_role, queries) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [first_name, last_name, email, phone, introduction, why_join, source, preferred_role, queries]
        );
        
        // Fire email
        await sendMemberNotificationEmail(first_name, last_name, email, phone, introduction, why_join, source, preferred_role, queries);
        
        // Sync to Google Sheets
        await syncToGoogleSheets(req.body);
        
        res.status(201).json({ message: 'Member registered successfully', id: result.insertId });
    } catch (error) {
        if(error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};

exports.getAllMembers = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM members ORDER BY created_at DESC');
        res.status(200).json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Database error' });
    }
};
