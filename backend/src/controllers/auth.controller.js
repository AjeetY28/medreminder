const authService = require('../services/auth.service');
const userRepository = require('../repositories/user.repository');
const logger = require('../config/logger');

class AuthController {
  /**
   * Firebase Phone Authentication endpoint.
   * Receives Firebase ID token from the Android app after client-side OTP verification.
   * Verifies the token with Firebase Admin SDK, extracts phone number,
   * creates/finds user in PostgreSQL, and returns our own JWT.
   */
  async firebasePhoneAuth(req, res, next) {
    try {
      const { firebaseIdToken } = req.body;
      
      if (!firebaseIdToken) {
        return res.status(400).json({
          success: false,
          message: 'firebaseIdToken is required',
        });
      }

      const { user, token } = await authService.verifyFirebaseToken(firebaseIdToken);
      
      return res.status(200).json({
        success: true,
        message: 'Phone authentication successful',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      logger.error('Error in firebasePhoneAuth controller: %o', error);
      return res.status(401).json({
        success: false,
        message: error.message || 'Phone authentication failed',
      });
    }
  }

  async googleLogin(req, res, next) {
    try {
      const { idToken } = req.body;
      const { user, token } = await authService.googleLogin(idToken);

      return res.status(200).json({
        success: true,
        message: 'Google login successful',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      logger.error('Error in googleLogin controller: %o', error);
      next(error);
    }
  }

  async appleLogin(req, res, next) {
    try {
      const { identityToken } = req.body;
      const { user, token } = await authService.appleLogin(identityToken);

      return res.status(200).json({
        success: true,
        message: 'Apple login successful',
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      logger.error('Error in appleLogin controller: %o', error);
      next(error);
    }
  }

  async updateFcmToken(req, res, next) {
    try {
      const userId = req.user.id;
      const { fcmToken } = req.body;

      if (!fcmToken) {
        return res.status(400).json({
          success: false,
          message: 'fcmToken is required',
        });
      }

      await userRepository.updateFcmToken(userId, fcmToken);

      return res.status(200).json({
        success: true,
        message: 'FCM push registration token updated successfully',
      });
    } catch (error) {
      logger.error('Error in updateFcmToken controller: %o', error);
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await userRepository.findById(userId);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      logger.error('Error in getMe controller: %o', error);
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { name } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Name is required',
        });
      }

      const user = await userRepository.updateName(userId, name.trim());

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: user,
      });
    } catch (error) {
      logger.error('Error in updateProfile controller: %o', error);
      next(error);
    }
  }
}

module.exports = new AuthController();
