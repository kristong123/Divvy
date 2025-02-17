const { db } = require("../config/firebase");

exports.login = async (req, res) => {
  console.log('Login attempt:', req.body);
  try {
    const { username, password } = req.body;

    // Get user document directly by username
    const userDoc = await db.collection('users').doc(username).get();

    if (!userDoc.exists) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const userData = userDoc.data();

    if (userData.password === password) {
      res.status(200).json({
        username: username,
        profilePicture: userData?.profilePicture || null,
        message: 'Login successful'
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
    const userDoc = await db.collection('users').doc(username).get();

    if (userDoc.exists) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Create new user document using username as the document ID
    const newUser = {
      username,
      password, // In production, hash the password
      profilePicture: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection('users').doc(username).set(newUser);

    res.status(201).json({
      message: 'Sign-up successful',
      user: { username }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};