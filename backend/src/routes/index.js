const express = require('express');
const authRoutes = require('./auth.routes');
const medicineRoutes = require('./medicine.routes');
const reminderRoutes = require('./reminder.routes');
const prescriptionRoutes = require('./prescription.routes');
const paymentRoutes = require('./payment.routes');
const familyRoutes = require('./family.routes');
const settingsRoutes = require('./settings.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

// Mount all modular sub-routers
router.use('/auth', authRoutes);
router.use('/medicines', medicineRoutes);
router.use('/reminders', reminderRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/payments', paymentRoutes);
router.use('/family', familyRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date()
  });
});

module.exports = router;
