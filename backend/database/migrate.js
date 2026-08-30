// backend/database/migrate.js
// Auto-creates ALL tables and seeds data on every server start.
// Uses INSERT IGNORE — safe to run multiple times, never duplicates.

const db = require('../config/db');

const MEMBERS_SEED = [
    ['PN-67917471', 'Vishal N. Shroff'],
    ['PN-67640856', 'Sanjay Zende'],
    ['PN-67679304', 'Madhumita Mohanty'],
    ['PN-05112998',  'Varghese Vattathara'],
    ['PN-67798070', 'Sachin U. Shrimandale'],
    ['PN-67940588', 'Alok Priyadarshi'],
    ['PN-67795418', 'Rohit Srivastava'],
    ['PN-67903641', 'Anil Kumar Sisodiya'],
    ['PN-67981963', 'Aarrit K. Tak'],
    ['PN-67909513', 'Alka Gawhade'],
    ['PN-67632772', 'Rahul Nandurkar'],
    ['PN-67940870', 'Rahul Sreekumar'],
    ['PN-67846902', 'Krushna Dhakne'],
    ['PN-06910190', 'Dinesh P. Chaudhari'],
    ['PN-67514406', 'Punit Hadani'],
    ['PN-67795382', 'Ankana Saumya'],
    ['PN-67778166', 'Ravikant Gawhade'],
    ['PN-67602787', 'Sandeep Dharmapurkar'],
    ['PN-67801863', 'Sugeesh Sugathan'],
    ['PN-67807513', 'Shashank Agarwal'],
    ['PN-07498085', 'Vaibhav S. Chouhan'],
    ['PN-67656411', 'Sanjai Pathak'],
    ['PN-67578553', 'Sushil K. Sharma'],
    ['PN-67927180', 'Akshit Agarwal'],
    ['PN-67994103', 'Kundan Kumar'],
    ['PN-67882879', 'Prachi Lendghar'],
    ['PN-67887482', 'Ulhas Khirwadkar'],
    ['PN-67927181', 'Aditya Modi'],
    ['PN-07690915', 'Kailashnath D. Pawar'],
    ['PN-68029308', 'Ashish Gupta'],
    ['PN-67729974', 'Deepak Ratnaparkhi'],
    ['PN-68021690', 'Manish Jha'],
    ['PN-68040650', 'Sourabh Saware'],
    ['PN-68040648', 'Sumit Agrawal'],
    ['PN-68010897', 'Milap P. Tank'],
    ['PN-68046248', 'Umesh Kute'],
];

async function migrate() {
    try {
        // ── 1. members ────────────────────────────────────────────────────────
        await db.execute(`
            CREATE TABLE IF NOT EXISTS members (
                id             INT AUTO_INCREMENT PRIMARY KEY,
                full_name      VARCHAR(150) NOT NULL,
                first_name     VARCHAR(100) NOT NULL,
                last_name      VARCHAR(100) NOT NULL,
                email          VARCHAR(255) NOT NULL UNIQUE,
                phone          VARCHAR(20) NOT NULL,
                birth_date     DATE NOT NULL,
                source         VARCHAR(255) NOT NULL,
                source_other   VARCHAR(255),
                photo_url      VARCHAR(500) NOT NULL,
                photo_filename VARCHAR(255) NOT NULL,
                introduction   TEXT,
                why_join       TEXT,
                preferred_role VARCHAR(100),
                hobbies        TEXT NOT NULL,
                queries        TEXT,
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ── 2. contacts ───────────────────────────────────────────────────────
        await db.execute(`
            CREATE TABLE IF NOT EXISTS contacts (
                id         INT AUTO_INCREMENT PRIMARY KEY,
                name       VARCHAR(150) NOT NULL,
                email      VARCHAR(255) NOT NULL,
                message    TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // ── 3. roles ──────────────────────────────────────────────────────────
        await db.execute(`
            CREATE TABLE IF NOT EXISTS roles (
                id        INT AUTO_INCREMENT PRIMARY KEY,
                role_name VARCHAR(100) NOT NULL UNIQUE
            )
        `);

        // Seed standard Toastmasters roles
        const standardRoles = [
            'Toastmaster of the Day', 'General Evaluator',
            'Ah-Counter', 'Grammarian', 'Timer', 'Speaker', 'Evaluator'
        ];
        for (const role of standardRoles) {
            await db.execute('INSERT IGNORE INTO roles (role_name) VALUES (?)', [role]);
        }

        // ── 4. member_roles ───────────────────────────────────────────────────
        // NOTE: ENUM includes Pending_Allocation & Pending_Cancel — these are
        // the intermediate states written by allocateRole() / cancelRole()
        // before admin approval.
        await db.execute(`
            CREATE TABLE IF NOT EXISTS member_roles (
                id           INT AUTO_INCREMENT PRIMARY KEY,
                member_id    INT NOT NULL,
                role_id      INT NOT NULL,
                meeting_date DATE NOT NULL,
                status       ENUM(
                                 'Pending_Allocation',
                                 'Assigned',
                                 'Pending_Cancel',
                                 'Cancelled'
                             ) DEFAULT 'Pending_Allocation',
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
                FOREIGN KEY (role_id)   REFERENCES roles(id)   ON DELETE CASCADE
            )
        `);

        // ── 5. club_members ───────────────────────────────────────────────────
        await db.execute(`
            CREATE TABLE IF NOT EXISTS club_members (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                customer_id VARCHAR(20)  NOT NULL UNIQUE,
                member_name VARCHAR(150) NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Seed all 36 club members (INSERT IGNORE skips duplicates)
        for (const [cid, name] of MEMBERS_SEED) {
            await db.execute(
                'INSERT IGNORE INTO club_members (customer_id, member_name) VALUES (?, ?)',
                [cid, name]
            );
        }

        // ── 6. Ensure cancel_reason column exists (idempotent) ────────────────
        try {
            await db.execute(`ALTER TABLE member_roles ADD COLUMN cancel_reason TEXT DEFAULT NULL AFTER status`);
            console.log('cancel_reason column added to member_roles');
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') throw e;
            // Column already exists — no action needed
        }

        const memberColumnStatements = [
            `ALTER TABLE members ADD COLUMN full_name VARCHAR(150) NULL AFTER id`,
            `ALTER TABLE members ADD COLUMN birth_date DATE NULL AFTER phone`,
            `ALTER TABLE members ADD COLUMN source_other VARCHAR(255) NULL AFTER source`,
            `ALTER TABLE members ADD COLUMN photo_url VARCHAR(500) NULL AFTER source_other`,
            `ALTER TABLE members ADD COLUMN photo_filename VARCHAR(255) NULL AFTER photo_url`,
            `ALTER TABLE members ADD COLUMN hobbies TEXT NULL AFTER why_join`
        ];

        for (const sql of memberColumnStatements) {
            try {
                await db.execute(sql);
            } catch (e) {
                if (!['ER_DUP_FIELDNAME', 'ER_BAD_FIELD_ERROR', 'ER_DUP_KEYNAME'].includes(e.code)) {
                    throw e;
                }
            }
        }

        try {
            await db.execute(`
                UPDATE members
                SET full_name = CONCAT(first_name, ' ', last_name)
                WHERE full_name IS NULL OR full_name = ''
            `);
        } catch (e) {
            console.warn('Could not backfill member full_name:', e.message);
        }

        const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM club_members');
        console.log(`DB migration done - ${total} club members ready`);

    } catch (err) {
        console.error('DB migration failed:', err.message);
        // Don't crash the server — just log the error
    }
}

module.exports = migrate;
