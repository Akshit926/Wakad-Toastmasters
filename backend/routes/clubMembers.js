const express = require('express');
const router = express.Router();
const clubMemberController = require('../controllers/clubMemberController');
const multer = require('multer');
const adminAuth = require('../middleware/adminAuth');

// Multer — store CSV in memory (no disk write needed)
const upload = multer({ storage: multer.memoryStorage() });

// ── Specific paths MUST be before wildcard /:customer_id ──────────────────────

// CSV bulk upload
router.post('/upload/csv', adminAuth, upload.single('csv'), clubMemberController.uploadCSV);

// Member login (by customer_id)
router.post('/auth/login', clubMemberController.login);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/',             adminAuth, clubMemberController.getAll);
router.post('/',            adminAuth, clubMemberController.create);
router.get('/:customer_id', clubMemberController.getOne);   // wildcard — must be last GET
router.put('/:id',          adminAuth, clubMemberController.update);
router.delete('/:id',       adminAuth, clubMemberController.remove);

module.exports = router;

