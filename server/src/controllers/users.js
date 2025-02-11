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
};

module.exports = { getUserProfile, updateUserProfile };