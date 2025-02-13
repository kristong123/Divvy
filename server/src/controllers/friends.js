const { db } = require("../config/firebase");

// Helper function to generate a consistent docId and validate user IDs
const getFriendDoc = async (user1, user2) => {
  if (!user1 || !user2) {
    throw new Error("User IDs required");
  }

  const docId = [user1, user2].sort().join("_");
  const friendDoc = await db.collection("friends").doc(docId).get();

  return { docId, friendDoc };
};

// Send a friend request
const sendFriendRequest = async (req, res) => {
  try {
    const { user1, user2 } = req.body;
    if (!user1 || !user2) {
      return res.status(400).json({ message: "User IDs required" });
    }

    // Ensure consistent document ID format
    const docId = [user1, user2].sort().join("_");
    const friendDoc = await db.collection("friends").doc(docId).get();

    if (friendDoc.exists) {
      const existingData = friendDoc.data();

      // If a pending request exists, accept it instead of re-sending
      if (existingData.status === "pending") {
        await db.collection("friends").doc(docId).update({ status: "accepted" });
        return res.status(200).json({ message: "Friend request auto-accepted!" });
      }

      if (existingData.status === "accepted") {
        return res.status(400).json({ message: "You are already friends" });
      }
    }

    // Otherwise, create a new friend request
    await db.collection("friends").doc(docId).set({
      user1,
      user2,
      status: "pending",
      createdAt: new Date(),
    });

    res.status(200).json({ message: "Friend request sent!" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get pending friend requests
const getPendingRequests = async (req, res) => {
  try {
    const userId = req.params.userId;

    const pendingSnapshot = await db.collection("friends")
      .where("status", "==", "pending")
      .get();

    const pendingRequests = [];
    pendingSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.user2 === userId) {  // Only show requests where the user is the recipient
        pendingRequests.push({
          requestId: doc.id,
          sender: data.user1,  // The person who sent the request
          createdAt: data.createdAt.toDate().toISOString(), // Timestamp
        });
      }
    });

    res.status(200).json({ pendingRequests });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Accept a friend request and move message requests to direct chat
const acceptFriendRequest = async (req, res) => {
  try {
    const { user1, user2 } = req.body;
    const { docId, friendDoc } = await getFriendDoc(user1, user2);

    if (!friendDoc.exists || friendDoc.data().status !== "pending") {
      return res.status(400).json({ message: "No pending friend request found" });
    }

    // Update friendship status
    await db.collection("friends").doc(docId).update({ status: "accepted" });

    // Check for message requests
    const messageRequestId = [user1, user2].sort().join("_");
    const messageRequestRef = db.collection("messageRequests").doc(messageRequestId);
    const messageSnapshot = await messageRequestRef.collection("messages").get();

    if (!messageSnapshot.empty) {
      const batch = db.batch();

      messageSnapshot.forEach((doc) => {
        batch.set(db.collection("chats").doc(messageRequestId).collection("messages").doc(doc.id), doc.data());
        batch.delete(doc.ref); // Remove from messageRequests
      });

      // Create a new chat entry in `chats`
      batch.set(db.collection("chats").doc(messageRequestId), {
        users: [user1, user2],
        lastMessage: "Friend request accepted.",
        updatedAt: new Date(),
      });

      // Commit all changes
      await batch.commit();

      // Delete the message request
      await messageRequestRef.delete();
    }

    res.status(200).json({ message: "Friend request accepted!" });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Cancel or Decline a friend request
const cancelOrDeclineFriendRequest = async (req, res) => {
  try {
    const { user1, user2, action } = req.body; // action: "cancel" or "decline"
    const { docId, friendDoc } = await getFriendDoc(user1, user2);

    if (!friendDoc.exists || friendDoc.data().status !== "pending") {
      return res.status(400).json({ message: `No pending friend request to ${action}` });
    }

    await db.collection("friends").doc(docId).delete();
    res.status(200).json({ message: `Friend request ${action}ed successfully` });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Get user's friends list
const getFriendsList = async (req, res) => {
  try {
    const userId = req.params.userId;
    const friendsSnapshot = await db.collection("friends").where("status", "==", "accepted").get();

    const friends = [];
    friendsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.user1 === userId) {
        friends.push(data.user2);
      } else if (data.user2 === userId) {
        friends.push(data.user1);
      }
    });

    res.status(200).json({ friends });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Remove a friend
const removeFriend = async (req, res) => {
  try {
    const { user1, user2 } = req.body;
    const { docId, friendDoc } = await getFriendDoc(user1, user2);

    if (!friendDoc.exists) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    await db.collection("friends").doc(docId).delete();
    res.status(200).json({ message: "Friend removed successfully!" });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Add this new function to get sent requests
const getSentRequests = async (req, res) => {
  try {
    const userId = req.params.userId;

    const sentSnapshot = await db.collection("friends")
      .where("user1", "==", userId)
      .where("status", "==", "pending")
      .get();

    const sentRequests = [];
    sentSnapshot.forEach((doc) => {
      const data = doc.data();
      sentRequests.push({
        recipient: data.user2,
        status: data.status,
        createdAt: data.createdAt.toDate().toISOString(),
      });
    });

    res.status(200).json({ sentRequests });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  cancelFriendRequest: async (req, res) => cancelOrDeclineFriendRequest({ ...req, body: { ...req.body, action: "cancel" } }, res),
  declineFriendRequest: async (req, res) => cancelOrDeclineFriendRequest({ ...req, body: { ...req.body, action: "decline" } }, res),
  getFriendsList,
  removeFriend,
  getPendingRequests,
  getSentRequests,
};