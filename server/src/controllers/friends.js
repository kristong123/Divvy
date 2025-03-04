const { db } = require("../config/firebase");

// Helper function to get friend document
exports.getFriendDoc = async (user1, user2) => {
  const snapshot = await db.collection("friends")
    .where('users', 'array-contains', user1)
    .where('status', '==', 'accepted')
    .get();

  let docId = null;
  let friendDoc = null;

  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.users.includes(user2)) {
      docId = doc.id;
      friendDoc = doc;
    }
  });

  return { docId, friendDoc };
};

exports.getFriends = async (req, res) => {
  try {
    const { username } = req.params;

    // Get from friends collection (this is correct as is)
    const friendsRef = await db.collection('friends')
      .where('users', 'array-contains', username)
      .get();

    const friends = [];
    for (const doc of friendsRef.docs) {
      const data = doc.data();
      // Get the other user's username
      const friendUsername = data.users.find(user => user !== username);

      // Fetch friend's profile data
      const userDoc = await db.collection('users').doc(friendUsername).get();
      const userData = userDoc.data();

      friends.push({
        username: friendUsername,
        profilePicture: userData?.profilePicture || null
      });
    }

    res.status(200).json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Failed to fetch friends' });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const { username } = req.params;
    // Get from friendRequests collection
    const snapshot = await db.collection('friendRequests')
      .where('recipient', '==', username)
      .where('status', '==', 'pending')
      .get();

    // Create an array to hold the requests with profile pictures
    const requests = [];

    // Process each request and fetch the sender's profile picture
    for (const doc of snapshot.docs) {
      const requestData = doc.data();

      // Get the sender's profile data to include their profile picture
      const senderDoc = await db.collection('users').doc(requestData.sender).get();
      const senderData = senderDoc.exists ? senderDoc.data() : {};

      requests.push({
        id: doc.id,
        ...requestData,
        profilePicture: senderData.profilePicture || null
      });
    }

    res.json(requests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: 'Failed to fetch pending requests' });
  }
};

exports.getSentRequests = async (req, res) => {
  try {
    const { username } = req.params;
    // Get from friendRequests collection
    const snapshot = await db.collection('friendRequests')
      .where('sender', '==', username)
      .where('status', '==', 'pending')
      .get();

    // Create an array to hold the requests with profile pictures
    const requests = [];

    // Process each request and fetch the recipient's profile picture
    for (const doc of snapshot.docs) {
      const requestData = doc.data();

      // Get the recipient's profile data to include their profile picture
      const recipientDoc = await db.collection('users').doc(requestData.recipient).get();
      const recipientData = recipientDoc.exists ? recipientDoc.data() : {};

      requests.push({
        id: doc.id,
        ...requestData,
        profilePicture: recipientData.profilePicture || null
      });
    }

    res.json(requests);
  } catch (error) {
    console.error('Error fetching sent requests:', error);
    res.status(500).json({ error: 'Failed to fetch sent requests' });
  }
};

exports.addFriend = async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    // Check if user2 exists
    const userDoc = await db.collection('users').doc(user2).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userData = userDoc.data();

    // Check if request already exists in friendRequests collection
    const existingRequest = await db.collection('friendRequests')
      .where('sender', '==', user1)
      .where('recipient', '==', user2)
      .where('status', '==', 'pending')
      .get();

    if (!existingRequest.empty) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    // Check if they're already friends
    const friendshipId = [user1, user2].sort().join('_');
    const friendshipDoc = await db.collection('friends').doc(friendshipId).get();
    if (friendshipDoc.exists) {
      return res.status(400).json({ message: 'Already friends with this user' });
    }

    // Create the friend request in friendRequests collection
    const requestRef = await db.collection('friendRequests').add({
      sender: user1,
      recipient: user2,
      status: 'pending',
      createdAt: new Date(),
      profilePicture: userData.profilePicture || null
    });

    res.status(200).json({
      message: 'Friend request sent',
      id: requestRef.id,
      profilePicture: userData.profilePicture || null
    });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({ message: 'Failed to send friend request' });
  }
};

exports.acceptFriend = async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    const requestRef = await db.collection('friends')
      .where('sender', '==', user1)
      .where('recipient', '==', user2)
      .where('status', '==', 'pending')
      .get();

    if (requestRef.empty) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Get sender's profile data
    const senderDoc = await db.collection('users').doc(user1).get();
    const senderData = senderDoc.data();

    await requestRef.docs[0].ref.update({ status: 'accepted' });
    res.status(200).json({
      message: 'Friend request accepted',
      profilePicture: senderData?.profilePicture || null
    });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({ message: 'Failed to accept friend request' });
  }
};

exports.declineFriend = async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    const requestRef = await db.collection('friends')
      .where('sender', '==', user1)
      .where('recipient', '==', user2)
      .where('status', '==', 'pending')
      .get();

    if (requestRef.empty) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    await requestRef.docs[0].ref.delete();
    res.status(200).json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Decline friend error:', error);
    res.status(500).json({ message: 'Failed to decline friend request' });
  }
};