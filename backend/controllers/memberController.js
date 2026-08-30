const fs = require('fs');
const db = require('../config/db');
const { sendMemberNotificationEmail } = require('../services/emailService');
const { syncToGoogleSheets } = require('../services/googleSheetsService');

exports.registerMember = async (req, res) => {
    const {
        full_name,
        email,
        phone,
        birth_date,
        source,
        source_other,
        introduction,
        hobbies,
        why_join,
        queries
    } = req.body;

    const photo = req.file;
    const normalizedName = String(full_name || '').trim().replace(/\s+/g, ' ');
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = String(phone || '').replace(/\D/g, '');
    const normalizedSource = String(source || '').trim();
    const normalizedSourceOther = String(source_other || '').trim();
    const normalizedIntro = String(introduction || '').trim();
    const normalizedHobbies = String(hobbies || '').trim();
    const normalizedWhyJoin = String(why_join || '').trim();
    const normalizedQueries = String(queries || '').trim();
    const cleanupPhoto = async () => {
        if (photo?.path) {
            try {
                await fs.promises.unlink(photo.path);
            } catch (_) {
                // Ignore cleanup failures.
            }
        }
    };
    const fail = async (message) => {
        await cleanupPhoto();
        return res.status(400).json({ error: message });
    };

    if (!normalizedName) return fail('Full name is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return fail('Please enter a valid email address.');
    }
    if (!/^\d{10}$/.test(normalizedPhone)) {
        return fail('Phone number must be exactly 10 digits.');
    }
    if (!birth_date) return fail('Birth date is required.');
    if (birth_date > new Date().toISOString().split('T')[0]) {
        return fail('Birth date cannot be in the future.');
    }
    if (!normalizedSource) return fail('Referral source is required.');
    if (normalizedSource === 'Others' && !normalizedSourceOther) {
        return fail('Please specify how you heard about us.');
    }
    if (!photo) return fail('Photo upload is required.');
    if (!normalizedIntro) return fail('Introduction is required.');
    if (!normalizedHobbies) return fail('Hobbies are required.');

    const nameParts = normalizedName.split(' ');
    const first_name = nameParts.shift();
    const last_name = nameParts.length ? nameParts.join(' ') : 'Unknown';
    const baseUrl = (process.env.BASE_URL || 'http://localhost:5001').replace(/\/$/, '');
    const photo_url = `${baseUrl}/uploads/member-photos/${photo.filename}`;

    try {
        const [result] = await db.execute(
            `INSERT INTO members (
                full_name, first_name, last_name, email, phone, birth_date,
                source, source_other, photo_url, photo_filename,
                introduction, why_join, hobbies, queries
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                normalizedName,
                first_name,
                last_name,
                normalizedEmail,
                normalizedPhone,
                birth_date,
                normalizedSource,
                normalizedSource === 'Others' ? normalizedSourceOther : null,
                photo_url,
                photo.filename,
                normalizedIntro,
                normalizedWhyJoin,
                normalizedHobbies,
                normalizedQueries
            ]
        );
        
        // Fire email
        await sendMemberNotificationEmail({
            full_name: normalizedName,
            first_name,
            last_name,
            email: normalizedEmail,
            phone: normalizedPhone,
            birth_date,
            source: normalizedSource,
            source_other: normalizedSource === 'Others' ? normalizedSourceOther : '',
            photo_url,
            photo_filename: photo.filename,
            introduction: normalizedIntro,
            hobbies: normalizedHobbies,
            why_join: normalizedWhyJoin,
            queries: normalizedQueries
        });
        
        // Sync to Google Sheets
        await syncToGoogleSheets({
            full_name: normalizedName,
            first_name,
            last_name,
            email: normalizedEmail,
            phone: normalizedPhone,
            birth_date,
            source: normalizedSource,
            source_other: normalizedSource === 'Others' ? normalizedSourceOther : '',
            photo_url,
            photo_filename: photo.filename,
            introduction: normalizedIntro,
            hobbies: normalizedHobbies,
            why_join: normalizedWhyJoin,
            queries: normalizedQueries
        });
        
        res.status(201).json({ message: 'Member registered successfully', id: result.insertId });
    } catch (error) {
        await cleanupPhoto();
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
