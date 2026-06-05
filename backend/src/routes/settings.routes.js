const express = require('express');
const settingsController = require('../controllers/settings.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// Public configuration check (used at app boot)
router.get('/', settingsController.getAppSettings);

// Admin-only system configurations updates
router.get('/admin', requireAuth, requireRole('ADMIN'), settingsController.getSettingsList);
router.put('/admin', requireAuth, requireRole('ADMIN'), settingsController.updateSetting);

module.exports = router;
