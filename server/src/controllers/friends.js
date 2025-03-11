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

    // If there are no friends, return empty array immediately
    if (friendsRef.empty) {
      return res.status(200).json([]);
    }

    // Collect all friend usernames
    const friendUsernames = [];
    const friendsData = [];

    for (const doc of friendsRef.docs) {
      const data = doc.data();
      // Get the other user's username
      const friendUsername = data.users.find(user => user !== username);
      friendUsernames.push(friendUsername);
      friendsData.push({
        docId: doc.id,
        friendUsername
      });
    }

    // If there are no friend usernames (shouldn't happen but just in case)
    if (friendUsernames.length === 0) {
      return res.status(200).json([]);
    }

    // Fetch all friend profiles in a single query
    const userDocs = await db.collection('users').where("username", "in", friendUsernames).get();
    const userDataMap = {};
    userDocs.forEach(doc => {
      userDataMap[doc.id] = doc.data();
    });

    // Map the data
    const friends = friendsData.map(item => {
      const userData = userDataMap[item.friendUsername] || {};
      return {
        username: item.friendUsername,
        profilePicture: userData.profilePicture || null
      };
    });

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

    // If there are no pending requests, return empty array immediately
    if (snapshot.empty) {
      return res.json([]);
    }

    // Collect all sender usernames
    const senderUsernames = [];
    const requestsData = [];

    for (const doc of snapshot.docs) {
      const requestData = doc.data();
      senderUsernames.push(requestData.sender);
      requestsData.push({
        id: doc.id,
        ...requestData
      });
    }

    // If there are no sender usernames (shouldn't happen but just in case)
    if (senderUsernames.length === 0) {
      return res.json([]);
    }

    // Fetch all sender profiles in a single query
    const userDocs = await db.collection('users').where("username", "in", senderUsernames).get();
    const userDataMap = {};
    userDocs.forEach(doc => {
      userDataMap[doc.id] = doc.data();
    });

    // Map the data
    const requests = requestsData.map(request => {
      const senderData = userDataMap[request.sender] || {};
      return {
        ...request,
        profilePicture: senderData.profilePicture || null
      };
    });

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

    // If there are no sent requests, return empty array immediately
    if (snapshot.empty) {
      return res.json([]);
    }

    // Collect all recipient usernames
    const recipientUsernames = [];
    const requestsData = [];

    for (const doc of snapshot.docs) {
      const requestData = doc.data();
      recipientUsernames.push(requestData.recipient);
      requestsData.push({
        id: doc.id,
        ...requestData
      });
    }

    // If there are no recipient usernames (shouldn't happen but just in case)
    if (recipientUsernames.length === 0) {
      return res.json([]);
    }

    // Fetch all recipient profiles in a single query
    const userDocs = await db.collection('users').where("username", "in", recipientUsernames).get();
    const userDataMap = {};
    userDocs.forEach(doc => {
      userDataMap[doc.id] = doc.data();
    });

    // Map the data
    const requests = requestsData.map(request => {
      const recipientData = userDataMap[request.recipient] || {};
      return {
        ...request,
        profilePicture: recipientData.profilePicture || null
      };
    });

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