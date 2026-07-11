// backend/middleware/adminAuth.js
// Express middleware to protect admin endpoints by checking the x-admin-password header

function adminAuth(req, res, next) {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.error('[auth] ADMIN_PASSWORD environment variable is not set. Access blocked.');
        return res.status(500).json({ error: 'Server configuration error. Admin access disabled.' });
    }

    const clientPassword = req.headers['x-admin-password'];

    if (clientPassword === adminPassword) {
        return next();
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid admin password.' });
}

module.exports = adminAuth;
