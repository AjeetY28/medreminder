const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const userRepository = require('../repositories/user.repository');
const logger = require('../config/logger');
const { admin, firebaseApp } = require('../config/firebase');

const googleClient = new OAuth2Client();

class AuthService {
  generateToken(user) {
    const payload = {
      id: user.id,
      role: user.role,
    };
    if (user.phone) payload.phone = user.phone;
    if (user.email) payload.email = user.email;

    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  }

  /**
   * Verify Firebase Phone Auth ID token.
   * The Android app uses Firebase SDK to send/verify OTP on the client side,
   * then sends the resulting Firebase ID token to this endpoint.
   * We verify the token using Firebase Admin SDK, extract the phone number,
   * and create/find the user in our PostgreSQL database.
   */
  async verifyFirebaseToken(firebaseIdToken) {
    if (!firebaseApp) {
      throw new Error('Firebase Admin SDK is not initialized. Check server configuration.');
    }

    try {
      // Verify the Firebase ID token using Firebase Admin SDK
      const decodedToken = await admin.auth(firebaseApp).verifyIdToken(firebaseIdToken);
      
      const uid = decodedToken.uid;
      const phone = decodedToken.phone_number;

      if (!phone) {
        throw new Error('No phone number associated with this Firebase account');
      }

      logger.info(`Firebase Phone Auth verified: uid=${uid}, phone=${phone}`);

      // Find or create user in our PostgreSQL database
      let user = await userRepository.findByPhone(phone);
      if (!user) {
        logger.info(`Creating new user account for Firebase phone auth: ${phone}`);
        user = await userRepository.create({ phone });
      }

      // Generate our own JWT for the app to use with our backend API
      const token = this.generateToken(user);
      return { user, token };
    } catch (error) {
      logger.error('Firebase token verification failed: %o', error.message || error);
      
      if (error.code === 'auth/id-token-expired') {
        throw new Error('Firebase token has expired. Please sign in again.');
      }
      if (error.code === 'auth/argument-error') {
        throw new Error('Invalid Firebase token format.');
      }
      
      throw new Error('Phone authentication failed: ' + (error.message || 'Unknown error'));
    }
  }

  async googleLogin(idToken) {
    let email;
    let googleId;

    // Helper for development testing
    if (process.env.NODE_ENV === 'development' && idToken.startsWith('mock-')) {
      email = `${idToken.substring(5)}@example.com`;
      googleId = `google_${idToken.substring(5)}`;
      logger.info(`[TEST MODE] Mock Google login authenticated for email: ${email}`);
    } else {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          // audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        email = payload.email;
        googleId = payload.sub;
      } catch (error) {
        logger.error('Google verification failed: %o', error);
        throw new Error('Google OAuth token verification failed');
      }
    }

    let user = await userRepository.findByGoogleId(googleId);
    if (!user) {
      // Check if user already exists with this email
      user = await userRepository.findByEmail(email);
      if (user) {
        // Link Google ID to existing user
        user = await userRepository.update(user.id, { google_id: googleId });
      } else {
        logger.info(`Creating new user account for Google sign-in: ${email}`);
        user = await userRepository.create({ email, googleId });
      }
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  async appleLogin(identityToken) {
    let email;
    let appleId;

    // Helper for development testing
    if (process.env.NODE_ENV === 'development' && identityToken.startsWith('mock-')) {
      email = `${identityToken.substring(5)}@example.com`;
      appleId = `apple_${identityToken.substring(5)}`;
      logger.info(`[TEST MODE] Mock Apple login authenticated for email: ${email}`);
    } else {
      try {
        // SECURITY WARNING: jwt.decode() does NOT verify the token signature.
        // For production, you MUST verify Apple's identity token against Apple's JWKS:
        //   1. Fetch public keys from https://appleid.apple.com/auth/keys
        //   2. Use jwks-rsa or jose library to verify the JWT signature
        //   3. Validate issuer (iss === 'https://appleid.apple.com')
        //   4. Validate audience (aud === your Apple Services ID)
        //   5. Validate expiry (exp)
        // 
        // Example with 'jose' library:
        //   import { createRemoteJWKSet, jwtVerify } from 'jose';
        //   const JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
        //   const { payload } = await jwtVerify(identityToken, JWKS, {
        //     issuer: 'https://appleid.apple.com',
        //     audience: process.env.APPLE_SERVICES_ID,
        //   });
        
        const decoded = jwt.decode(identityToken, { complete: true });
        if (!decoded || !decoded.payload || !decoded.payload.sub) {
          throw new Error('Invalid Apple token payload');
        }

        // Verify essential claims even with decode-only
        if (decoded.payload.iss !== 'https://appleid.apple.com') {
          throw new Error('Invalid Apple token issuer');
        }
        if (decoded.payload.exp && decoded.payload.exp * 1000 < Date.now()) {
          throw new Error('Apple token has expired');
        }

        appleId = decoded.payload.sub;
        email = decoded.payload.email || `${appleId}@privaterelay.appleid.com`;
      } catch (error) {
        logger.error('Apple token decoding failed: %o', error);
        throw new Error('Apple OAuth token verification failed');
      }
    }

    let user = await userRepository.findByAppleId(appleId);
    if (!user) {
      user = await userRepository.findByEmail(email);
      if (user) {
        user = await userRepository.update(user.id, { apple_id: appleId });
      } else {
        logger.info(`Creating new user account for Apple sign-in: ${email}`);
        user = await userRepository.create({ email, appleId });
      }
    }

    const token = this.generateToken(user);
    return { user, token };
  }
}

module.exports = new AuthService();
