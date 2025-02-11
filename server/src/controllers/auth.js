const { db, admin } = require("../config/firebase");

exports.login = async (req, res) => {
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
};

exports.signup = async (req, res) => {
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
};