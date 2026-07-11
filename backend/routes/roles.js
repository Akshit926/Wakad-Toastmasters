const express = require('express');
const router  = express.Router();
const roleController = require('../controllers/roleController');
const adminAuth = require('../middleware/adminAuth');

// Member actions
router.post('/allocate', roleController.allocateRole);
router.post('/cancel',   roleController.cancelRole);

// Admin dashboard — get all role assignments
router.get('/all', roleController.getAllRoles);

// Admin dashboard — approve/reject/delete (PATCH + DELETE)
router.patch('/approve-allocate', adminAuth, roleController.approveAllocate);
router.patch('/approve-cancel',   adminAuth, roleController.approveCancel);
router.patch('/reject-allocate',  adminAuth, roleController.rejectAllocate);
router.delete('/:id',             adminAuth, roleController.deleteRole);

// Email one-click links (GET — opens in browser from email)
router.get('/approve-allocate', roleController.approveAllocate);
router.get('/approve-cancel',   roleController.approveCancel);
router.get('/reject-allocate',  roleController.rejectAllocate);

module.exports = router;
