const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
const PORT = 3000;

// Load environment variables
require('dotenv').config();

// Debugging: Check the current working directory
console.log('Current working directory:', process.cwd());

// Firebase Admin SDK initialization
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Get Firebase database reference
const db = admin.firestore();

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://https://divvy-1655shfsb-kristong123s-projects.vercel.app/'
    ];

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Login endpoint with database query
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Query users collection
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).get();

    if (snapshot.empty) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // In production, you should use proper password hashing
    if (userData.password === password) {
      res.status(200).json({
        message: 'Login successful',
        user: {
          id: userDoc.id,
          username: userData.username
        }
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Sign-up endpoint with database insertion
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if username exists
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).get();

    if (!snapshot.empty) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user document
    const newUser = {
      username,
      password, // In production, hash the password
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await usersRef.add(newUser);

    res.status(201).json({
      message: 'Sign-up successful',
      user: {
        id: docRef.id,
        username
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Example of querying user profile
app.get('/api/users/:userId', async (req, res) => {
  try {
    const userRef = db.collection('users').doc(req.params.userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = doc.data();
    // Remove sensitive information
    delete userData.password;

    res.status(200).json(userData);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Example of updating user profile
app.put('/api/users/:userId', async (req, res) => {
  try {
    const { name, email } = req.body;
    const userRef = db.collection('users').doc(req.params.userId);

    await userRef.update({
      name,
      email,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});