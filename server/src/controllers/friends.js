const { db } = require("../config/firebase");

// Helper function to get friend document
const getFriendDoc = async (user1, user2) => {
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
    console.log('Fetching friends for:', username);

    const friendsRef = await db.collection('friends')
      .where('status', '==', 'accepted')
      .get();

    console.log('Found friends docs:', friendsRef.size);

    const friends = [];
    for (const doc of friendsRef.docs) {
      const data = doc.data();

      if (data.user1 === username || data.user2 === username) {
        const friendUsername = data.user1 === username ? data.user2 : data.user1;

        // Fetch friend's profile data
        const userDoc = await db.collection('users').doc(friendUsername).get();
        const userData = userDoc.data();

        friends.push({
          username: friendUsername,
          profilePicture: userData?.profilePicture || null
        });
      }
    }

    console.log('Returning friends:', friends);
    res.status(200).json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Failed to fetch friends' });
  }
};

exports.getPendingRequests = async (req, res) => {
  try {
    const { username } = req.params;
    const requestsRef = await db.collection('friends')
      .where('recipient', '==', username)
      .where('status', '==', 'pending')
      .get();

    const requests = [];
    requestsRef.forEach(doc => {
      const data = doc.data();
      requests.push({
        sender: data.sender,
        createdAt: data.createdAt,
        profilePicture: null
      });
    });

    res.status(200).json(requests);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: 'Failed to fetch pending requests' });
  }
};

exports.getSentRequests = async (req, res) => {
  try {
    const { username } = req.params;
    const sentRef = await db.collection('friends')
      .where('sender', '==', username)
      .where('status', '==', 'pending')
      .get();

    const sent = [];
    // Fetch each recipient's profile data
    for (const doc of sentRef.docs) {
      const data = doc.data();
      // Get recipient's profile data
      const recipientDoc = await db.collection('users').doc(data.recipient).get();
      const recipientData = recipientDoc.data();

      sent.push({
        recipient: data.recipient,
        createdAt: data.createdAt,
        status: 'pending',
        profilePicture: recipientData?.profilePicture || null
      });
    }

    res.status(200).json(sent);
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ message: 'Failed to fetch sent requests' });
  }
};

exports.addFriend = async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    // Create sorted friendship ID to ensure consistency
    const names = [user1, user2].sort();
    const friendshipId = `${names[0]}_${names[1]}`;

    // Check if user2 exists and get their profile data
    const userDoc = await db.collection('users').doc(user2).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userData = userDoc.data();

    // Check if friendship document already exists
    const friendshipDoc = await db.collection('friends').doc(friendshipId).get();
    if (friendshipDoc.exists) {
      const data = friendshipDoc.data();
      if (data.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends with this user' });
      } else {
        return res.status(400).json({ message: 'Friend request already exists' });
      }
    }

    // If all checks pass, create the friend request with the deterministic ID
    await db.collection('friends').doc(friendshipId).set({
      user1: names[0],  // Store names in sorted order
      user2: names[1],
      sender: user1,    // Keep original sender/recipient
      recipient: user2,
      status: 'pending',
      createdAt: new Date()
    });

    res.status(200).json({
      message: 'Friend request sent',
      profilePicture: userData?.profilePicture || null
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