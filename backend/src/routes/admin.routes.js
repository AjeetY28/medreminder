const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Public route for admin authentication
router.post('/login', adminController.login);

// Protected routes (Admin role only)
router.use(requireAuth, requireRole('ADMIN'));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.put('/users/:id/block', adminController.blockUser);
router.put('/users/:id/unblock', adminController.unblockUser);
router.delete('/users/:id', adminController.deleteUser);

// Global operational query routes
router.get('/medicines', adminController.getMedicines);
router.get('/logs', adminController.getLogs);
router.get('/prescriptions', adminController.getPrescriptions);
router.get('/payments', adminController.getPayments);

// Push notification endpoints
router.post('/notifications/broadcast', adminController.broadcastNotification);
router.post('/notifications/custom', adminController.customNotification);

// Reports export endpoints
router.get('/reports/csv', adminController.exportLogsCSV);
router.get('/reports/excel', adminController.exportLogsExcel);

module.exports = router;
