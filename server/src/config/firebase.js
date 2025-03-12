const admin = require('firebase-admin');
require('dotenv').config();

// Check if credentials are available
if (!process.env.FIREBASE_ADMIN_KEY) {
  throw new Error('FIREBASE_ADMIN_KEY environment variable is not set');
}

try {
  // Parse the credentials from environment variable
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

  // Initialize Firebase Admin
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "divvy-14457.firebasestorage.app"
  });

  // Get Firestore instance
  const db = admin.firestore();

  module.exports = { admin, db };
} catch (error) {
  console.error('Firebase initialization error:', error);
  throw error;
}