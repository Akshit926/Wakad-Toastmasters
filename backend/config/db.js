// dotenv is loaded once in server.js — no need to load here
const mysql = require('mysql2/promise');

// Detect Unix socket (Cloud Run) vs TCP (local dev)
// Cloud SQL unix socket paths start with /cloudsql/
const isSocket = process.env.DB_HOST && process.env.DB_HOST.startsWith('/');

const poolConfig = {
    user:               process.env.DB_USER || process.env.MYSQLUSER,
    password:           process.env.DB_PASSWORD || process.env.MYSQLPASSWORD,
    database:           process.env.DB_NAME || process.env.MYSQLDATABASE,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
};

if (isSocket) {
    // Cloud Run → Cloud SQL via Unix socket (no DNS lookup)
    poolConfig.socketPath = process.env.DB_HOST;
} else {
    // Local development via TCP or Railway
    poolConfig.host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
    poolConfig.port = parseInt(process.env.DB_PORT || process.env.MYSQLPORT || '3306', 10);
}

const pool = mysql.createPool(poolConfig);

// Verify connectivity at startup (non-fatal — won't crash the server)
pool.getConnection()
    .then(conn => {
        const target = isSocket
            ? `unix:${process.env.DB_HOST}`
            : `${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`;
        console.log(`[db] Connected to MySQL at ${target}`);
        conn.release();
    })
    .catch(err => {
        console.error('[db] MySQL connection failed:', err.message);
    });

module.exports = pool;
