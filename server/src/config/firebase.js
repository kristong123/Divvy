const dotenv = require('dotenv');

// Load environment variables
require('dotenv').config();


//Check the current working directory
console.log("FIREBASE_ADMIN_KEY:", process.env.FIREBASE_ADMIN_KEY ? "Loaded" : "Missing");

if (!process.env.FIREBASE_ADMIN_KEY) {
  throw new Error("FIREBASE_ADMIN_KEY is missing in the environment variables!");
}

// Firebase Admin SDK initialization
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Get Firebase database reference
const db = admin.firestore();

module.exports = { admin, db };