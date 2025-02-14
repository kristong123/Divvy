const dotenv = require('dotenv');

// Firebase Admin SDK initialization
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Get Firebase database reference
const db = admin.firestore();

module.exports = { admin, db };