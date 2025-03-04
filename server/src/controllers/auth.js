const { db } = require("../config/firebase");

exports.login = async (req, res) => {
  try {
    console.log('Login request received:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Get user document directly by username
    const userDoc = await db.collection('users').doc(username).get();

    if (!userDoc.exists) {
      console.log(`User not found: ${username}`);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const userData = userDoc.data();
    console.log(`User found: ${username}, validating password`);

    if (userData.password === password) {
      console.log(`Login successful for user: ${username}`);
      const responseData = {
        username: username,
        profilePicture: userData?.profilePicture || null,
        venmoUsername: userData?.venmoUsername || null,  // Make sure this is included
        message: 'Login successful'
      };
      res.status(200).json(responseData);
    } else {
      console.log(`Invalid password for user: ${username}`);
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.signup = async (req, res) => {
  try {
    console.log('Signup request received:', req.body);
    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if username exists
    const userDoc = await db.collection('users').doc(username).get();

    if (userDoc.exists) {
      console.log(`Username already exists: ${username}`);
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
    console.log(`User created successfully: ${username}`);

    res.status(201).json({
      message: 'Sign-up successful',
      user: { username }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};