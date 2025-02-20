const { db } = require("../config/firebase");

// Get user profile
const getUserProfile = async (req, res) => {
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
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { venmoUsername } = req.body;
    const userRef = db.collection('users').doc(req.params.userId);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    await userRef.update({
      venmoUsername,
      updatedAt: new Date()
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      venmoUsername
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getUserProfile, updateUserProfile };