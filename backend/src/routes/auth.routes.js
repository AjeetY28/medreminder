const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validator.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  googleLoginSchema,
  appleLoginSchema
} = require('../validators/auth.validator');

const router = express.Router();

// Firebase Phone Auth — client-side OTP, server-side token verification
router.post('/firebase/phone', authController.firebasePhoneAuth);

// Social login
router.post('/google', validate(googleLoginSchema), authController.googleLogin);
router.post('/apple', validate(appleLoginSchema), authController.appleLogin);

// Protected routes
router.put('/fcm', requireAuth, authController.updateFcmToken);
router.get('/me', requireAuth, authController.getMe);
router.put('/profile', requireAuth, authController.updateProfile);

module.exports = router;
