const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const memberController = require('../controllers/memberController');

const uploadDir = path.join(__dirname, '..', 'uploads', 'member-photos');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const safeName = file.originalname
            .toLowerCase()
            .replace(/[^a-z0-9._-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        cb(null, `${Date.now()}-${safeName || 'member-photo'}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed.'));
        }
        cb(null, true);
    }
});

router.post('/register', (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, memberController.registerMember);
router.get('/', memberController.getAllMembers);

module.exports = router;
