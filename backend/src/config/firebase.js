const admin = require('firebase-admin');
const logger = require('./logger');

let firebaseApp = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    // Clean formatting for private key
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    }, 'medireminder-admin');
    
    logger.info('Firebase Admin SDK initialized successfully.');
  } else {
    logger.warn('Firebase environment variables (FIREBASE_PROJECT_ID, etc.) are not fully set. FCM push notifications will fall back to simulation/mock mode.');
  }
} catch (error) {
  logger.error('Failed to initialize Firebase Admin SDK: %o', error);
}

module.exports = {
  admin,
  firebaseApp,
  isInitialized: () => firebaseApp !== null,
};
