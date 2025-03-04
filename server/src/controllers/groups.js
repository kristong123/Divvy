const { db } = require("../config/firebase");
const { getIO } = require('../config/socket');

exports.createGroup = async (req, res) => {
  try {
    const { name, createdBy } = req.body;

    const groupRef = await db.collection("groupChats").add({
      name,
      createdBy,
      admin: createdBy,
      users: [createdBy],
      lastMessage: "",
      updatedAt: new Date(),
      createdAt: new Date(),
      currentEvent: {
        id: "",
        title: "",
        date: "",
        description: "",
        expenses: []
      }
    });

    // Get user data for response only
    const userDoc = await db.collection("users").doc(createdBy).get();
    const userData = userDoc.data();

    res.status(201).json({
      id: groupRef.id,
      name,
      createdBy,
      users: [{
        username: createdBy,
        profilePicture: userData?.profilePicture || null,
        isAdmin: true
      }],
      currentEvent: {
        id: "",
        title: "",
        date: "",
        description: "",
        expenses: []
      }
    });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Failed to create group" });
  }
};

exports.getUserGroups = async (req, res) => {
  try {
    const username = req.params.username;
    const groupsSnapshot = await db.collection('groupChats')
      .where('users', 'array-contains', username)
      .get();

    const groups = [];
    for (const doc of groupsSnapshot.docs) {
      const groupData = doc.data();

      // Fetch user details for each member including venmoUsername
      const userPromises = groupData.users.map(async (username) => {
        const userDoc = await db.collection("users").doc(username).get();
        const userData = userDoc.data();
        return {
          username,
          profilePicture: userData?.profilePicture || null,
          venmoUsername: userData?.venmoUsername || null,
          isAdmin: username === groupData.admin
        };
      });

      const users = await Promise.all(userPromises);

      const group = {
        id: doc.id,
        ...groupData,
        users,
        currentEvent: groupData.currentEvent || null,
        isGroup: true
      };
      groups.push(group);
    }

    res.status(200).json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Failed to fetch groups' });
  }
};

exports.createGroupChat = async (req, res) => {
  try {
    const { name, createdBy } = req.body;

    // Create group with just username reference
    const groupRef = await db.collection("groupChats").add({
      name,
      createdBy,
      admin: createdBy,
      users: [createdBy],
      lastMessage: "",
      updatedAt: new Date(),
      createdAt: new Date(),
      // Add an empty currentEvent field to prevent null reference errors
      currentEvent: {
        id: "",
        title: "",
        date: "",
        description: "",
        expenses: []
      }
    });

    // Get creator's data for the response only
    const userDoc = await db.collection("users").doc(createdBy).get();
    const userData = userDoc.data();

    res.status(201).json({
      id: groupRef.id,
      name,
      createdBy,
      admin: createdBy,
      users: [{
        username: createdBy,
        profilePicture: userData?.profilePicture || null,
        isAdmin: true
      }],
      // Include the empty currentEvent in the response
      currentEvent: {
        id: "",
        title: "",
        date: "",
        description: "",
        expenses: []
      }
    });
  } catch (error) {
    console.error("Error creating group chat:", error);
    res.status(500).json({ message: "Failed to create group chat" });
  }
};

exports.sendGroupMessage = async (req, res) => {
  try {
    const { groupId } = req.params;  // Get from URL params
    const { content, senderId } = req.body;

    const groupRef = db.collection('groupChats').doc(groupId);

    // Verify group exists
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Add message
    const messageRef = await groupRef.collection('messages').add({
      content,
      senderId,
      timestamp: new Date(),
      system: false
    });

    // Update group
    await groupRef.update({
      lastMessage: content,
      lastMessageTime: new Date(),
      updatedAt: new Date()
    });

    // Get message with ID
    const messageDoc = await messageRef.get();
    const messageData = {
      id: messageRef.id,
      ...messageDoc.data(),
      timestamp: messageDoc.data().timestamp.toDate().toISOString()
    };

    res.status(201).json(messageData);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message' });
  }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const groupRef = db.collection("groupChats").doc(groupId);

    // Verify group exists
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group chat not found" });
    }

    // Get messages from subcollection
    const messagesSnapshot = await groupRef
      .collection("messages")
      .orderBy("timestamp", "asc")
      .get();

    const messages = messagesSnapshot.docs.map(doc => {
      const data = doc.data();
      let timestamp;
      try {
        if (data.timestamp && data.timestamp.toDate) {
          // Handle Firestore Timestamp
          timestamp = data.timestamp.toDate().toISOString();
        } else if (data.timestamp instanceof Date) {
          // Handle JavaScript Date
          timestamp = data.timestamp.toISOString();
        } else if (typeof data.timestamp === 'string') {
          // Handle ISO string
          timestamp = data.timestamp;
        } else {
          // Fallback to current time
          timestamp = new Date().toISOString();
        }
      } catch (error) {
        console.error('Error processing timestamp:', error);
        timestamp = new Date().toISOString();
      }

      return {
        ...data,
        timestamp,
        id: doc.id
      };
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

exports.addUserToGroup = async (req, res) => {
  try {
    const { groupId, adminId, userId } = req.body;
    if (!groupId || !adminId || !userId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const groupRef = db.collection("groupChats").doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();
    if (groupData.admin !== adminId) {
      return res.status(403).json({ message: "Only the admin can add users." });
    }

    if (groupData.users.includes(userId)) {
      return res.status(400).json({ message: "User is already in the group" });
    }

    // Add just the username
    await groupRef.update({
      users: [...groupData.users, userId], // Just store username
    });

    // Get socket instance
    const io = getIO();
    io.to(userId).emit('user-added-to-group', { groupId });

    res.status(200).json({ message: "User added to group!" });
  } catch (error) {
    console.error("Error adding user to group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.removeUserFromGroup = async (req, res) => {
  try {
    const { groupId, adminId, userId } = req.body;
    if (!groupId || !adminId || !userId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const groupRef = db.collection("groupChats").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();

    if (groupData.admin !== adminId) {
      return res.status(403).json({ message: "Only the admin can remove users." });
    }

    if (!groupData.users.includes(userId)) {
      return res.status(400).json({ message: "User is not in the group" });
    }

    const updatedUsers = groupData.users.filter(user => user !== userId);
    await groupRef.update({ users: updatedUsers });

    // Get socket instance
    const io = getIO();
    io.to(userId).emit('user-removed-from-group', { groupId });

    res.status(200).json({ message: "User removed from group!" });
  } catch (error) {
    console.error("Error removing user from group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.leaveGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    if (!groupId || !userId) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const groupRef = db.collection("groupChats").doc(groupId);
    const groupDoc = await groupRef.get();
    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();
    const updatedUsers = groupData.users.filter(user => user !== userId);

    if (groupData.admin === userId) {
      if (updatedUsers.length === 0) {
        await groupRef.delete();
        return res.status(200).json({ message: "Group deleted as the last admin left." });
      } else {
        await groupRef.update({ admin: updatedUsers[0] }); // Assign new admin
      }
    }

    await groupRef.update({ users: updatedUsers });

    res.status(200).json({ message: "User left the group!" });
  } catch (error) {
    console.error("Error leaving group:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.body;

    // Get the group data first to get all users
    const groupRef = db.collection('groupChats').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const groupData = groupDoc.data();

    // Delete the group
    await groupRef.delete();

    // Get socket instance
    const io = getIO();

    // Emit event to all users
    io.emit('group-deleted', groupId);

    res.status(200).json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ message: 'Failed to delete group' });
  }
};

exports.getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params;
    const groupRef = db.collection("groupChats").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();

    // Fetch user details for each username in the group
    const userPromises = groupData.users.map(async (username) => {
      const userDoc = await db.collection("users").doc(username).get();
      if (!userDoc.exists) {
        return {
          username,
          profilePicture: null,
          isAdmin: username === groupData.admin
        };
      }
      const userData = userDoc.data();
      return {
        username,
        profilePicture: userData.profilePicture || null,
        isAdmin: username === groupData.admin
      };
    });

    const users = await Promise.all(userPromises);

    res.status(200).json({
      groupId,
      name: groupData.name,
      admin: groupData.admin,
      users, // Now contains full user details
      createdBy: groupData.createdBy,
      createdAt: groupData.createdAt,
      updatedAt: groupData.updatedAt
    });
  } catch (error) {
    console.error("Error fetching group details:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateGroupChat = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { adminId, name, description, newAdmin } = req.body;

    const groupRef = db.collection("groupChats").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();
    if (groupData.admin !== adminId) {
      return res.status(403).json({ message: "Only the admin can update group settings" });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (newAdmin && groupData.users.includes(newAdmin)) {
      updateData.admin = newAdmin;
    }

    await groupRef.update(updateData);

    res.status(200).json({ message: "Group updated successfully!" });
  } catch (error) {
    console.error("Error updating group chat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.sendGroupInvite = async (req, res) => {
  try {
    const { groupId, username, invitedBy } = req.body;

    // Get the group document
    const groupRef = db.collection("groupChats").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();

    // Check if user is already in the group
    if (groupData.users.includes(username)) {
      return res.status(400).json({ message: "User is already in the group" });
    }

    // Create a unique ID for this invite
    const inviteId = `invite_${groupId}_${Date.now()}`;

    // Get socket instance
    const io = getIO();

    // Emit socket event for the group invite
    io.to(username).emit('group-invite', {
      id: inviteId,
      groupId,
      groupName: groupData.name,
      invitedBy: invitedBy || groupData.admin
    });

    // Also send a message to the direct chat between inviter and invitee
    const chatId = [invitedBy, username].sort().join('_');

    // Create a message object for the direct chat
    const message = {
      id: inviteId,
      senderId: invitedBy,
      senderName: invitedBy,
      content: `${invitedBy} invited you to join ${groupData.name}`,
      timestamp: new Date(),
      type: 'group-invite',
      groupId,
      groupName: groupData.name,
      invitedBy,
      status: 'sent'
    };

    // Check if the friends document exists, create it if it doesn't
    const friendsDocRef = db.collection('friends').doc(chatId);
    const friendsDoc = await friendsDocRef.get();

    if (!friendsDoc.exists) {
      // Create the friends document if it doesn't exist
      await friendsDocRef.set({
        users: [invitedBy, username],
        createdAt: new Date(),
        status: 'accepted'
      });
    }

    // Save the message to the friends collection's messages subcollection
    await db.collection('friends')
      .doc(chatId)
      .collection('messages')
      .doc(inviteId)
      .set(message);

    // Update the message with its ID for the socket event
    const messageWithId = {
      ...message,
      timestamp: message.timestamp.toISOString()
    };

    // Emit a new message event to both users
    io.to(username).emit('new-message', {
      chatId,
      message: messageWithId
    });

    io.to(invitedBy).emit('new-message', {
      chatId,
      message: messageWithId
    });

    res.status(200).json({ message: 'Invite sent successfully' });
  } catch (error) {
    console.error("Error sending group invite:", error);
    res.status(500).json({ message: "Failed to send invite" });
  }
};

exports.joinGroup = async (req, res) => {
  try {
    const { groupId, username, inviteId, inviteStatus } = req.body;

    console.log(`[joinGroup] Request received: groupId=${groupId}, username=${username}, inviteId=${inviteId}`);

    const groupRef = db.collection('groupChats').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      console.log(`[joinGroup] Group not found: ${groupId}`);
      return res.status(404).json({ message: 'Group not found' });
    }

    const groupData = groupDoc.data();

    // Check if user is the admin/creator of the group
    if (username === groupData.admin) {
      console.log(`[joinGroup] User ${username} is the admin, cannot accept own invite`);
      return res.status(400).json({
        message: 'Cannot accept your own invite'
      });
    }

    // Check if user is already in group
    if (groupData.users.includes(username)) {
      console.log(`[joinGroup] User ${username} is already in group ${groupId}`);
      return res.status(400).json({
        message: 'You are already a member of this group'
      });
    }

    // Add user to group
    console.log(`[joinGroup] Adding user ${username} to group ${groupId}`);
    await groupRef.update({
      users: [...groupData.users, username]
    });

    // Add system message for user joining
    await groupRef.collection('messages').add({
      content: `${username} joined the group`,
      senderId: 'system',
      senderName: 'System',
      timestamp: new Date(),
      type: 'system'
    });

    // Update invite status in the database if inviteId is provided
    if (inviteId) {
      try {
        console.log(`[joinGroup] Updating invite status for invite ${inviteId} to ${inviteStatus || 'accepted'}`);

        // Get all friends collections
        const friendsCollections = await db.collection('friends').get();
        let inviteFound = false;

        // Manually search through each friends collection's messages
        for (const friendDoc of friendsCollections.docs) {
          const messagesCollection = friendDoc.ref.collection('messages');
          const messagesQuery = await messagesCollection.where('id', '==', inviteId).get();

          if (!messagesQuery.empty) {
            // Update each matching invite message
            const batch = db.batch();
            messagesQuery.docs.forEach(doc => {
              const data = doc.data();
              // Only update if it's a group invite
              if (data.type === 'group-invite') {
                console.log(`[joinGroup] Found invite message at path: ${doc.ref.path}`);
                batch.update(doc.ref, {
                  status: inviteStatus || 'accepted'
                });
                inviteFound = true;
              }
            });

            if (inviteFound) {
              await batch.commit();
              console.log(`[joinGroup] Successfully updated invite status`);
            }
          }
        }

        if (!inviteFound) {
          console.log(`[joinGroup] No invite found with ID: ${inviteId}`);
        }
      } catch (inviteError) {
        console.error('[joinGroup] Error updating invite status:', inviteError);
        // Continue with the join process even if updating the invite fails
      }
    }

    // Get updated group data
    const updatedGroupDoc = await groupRef.get();
    const updatedData = updatedGroupDoc.data();

    // Fetch user details for response
    const userPromises = updatedData.users.map(async (username) => {
      const userDoc = await db.collection("users").doc(username).get();
      const userData = userDoc.data();
      return {
        username,
        profilePicture: userData?.profilePicture || null,
        isAdmin: username === updatedData.admin
      };
    });

    const users = await Promise.all(userPromises);

    // Ensure currentEvent is included in the response
    const currentEvent = updatedData.currentEvent || {
      id: "",
      title: "",
      date: "",
      description: "",
      expenses: []
    };

    // Get socket instance
    const io = getIO();

    // Emit event to all users in the group
    updatedData.users.forEach(user => {
      io.to(user).emit('group-invite-accepted', {
        groupId,
        username,
        group: {
          id: groupId,
          name: updatedData.name,
          users,
          admin: updatedData.admin,
          createdBy: updatedData.createdBy,
          createdAt: updatedData.createdAt,
          updatedAt: updatedData.updatedAt,
          currentEvent
        }
      });
    });

    res.status(200).json({
      id: groupId,
      name: updatedData.name,
      users,
      admin: updatedData.admin,
      createdBy: updatedData.createdBy,
      createdAt: updatedData.createdAt,
      updatedAt: updatedData.updatedAt,
      currentEvent
    });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Failed to join group' });
  }
};

exports.setGroupEvent = async (req, res) => {
  try {
    const { groupId } = req.params;
    const eventData = req.body;

    const groupRef = db.collection('groupChats').doc(groupId);

    if (eventData) {
      // If there's event data, update with new event
      await groupRef.update({
        currentEvent: {
          ...eventData,
          updatedAt: new Date()
        }
      });
    } else {
      // If no event data (null), remove the entire currentEvent field
      await groupRef.update({
        currentEvent: null
      });
    }

    res.status(200).json({ message: 'Event updated successfully' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ message: 'Failed to update event' });
  }
};

exports.checkGroupStatus = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.query;

    const groupRef = db.collection("groupChats").doc(groupId);
    const groupDoc = await groupRef.get();

    // Check if group exists
    if (!groupDoc.exists) {
      return res.status(200).json({ exists: false, isMember: false });
    }

    const groupData = groupDoc.data();

    // Check if user is a member
    const isMember = groupData.users.includes(username);

    res.status(200).json({ exists: true, isMember });
  } catch (error) {
    console.error("Error checking group status:", error);
    res.status(500).json({ message: "Failed to check group status" });
  }
};

const updateGroupProfilePicture = async (req, res) => {
  try {
    upload(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ message: 'File upload error' });
      }

      const { groupId, adminId } = req.body;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      // Verify group exists and user is admin
      const groupRef = db.collection("groupChats").doc(groupId);
      const groupDoc = await groupRef.get();

      if (!groupDoc.exists) {
        return res.status(404).json({ message: "Group not found" });
      }

      const groupData = groupDoc.data();
      if (groupData.admin !== adminId) {
        return res.status(403).json({ message: "Only the admin can update group settings" });
      }

      try {
        // Upload new image to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          {
            folder: 'group_pictures',
            public_id: `group-${groupId}-${Date.now()}`
          }
        );

        // Delete old profile picture if it exists
        if (groupData.profilePicture) {
          const oldImageUrl = groupData.profilePicture;
          const publicId = oldImageUrl.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`group_pictures/${publicId}`);
        }

        // Update group with new profile picture
        await groupRef.update({
          profilePicture: uploadResponse.secure_url,
          updatedAt: new Date()
        });

        // notify group members if notifcations doesn't do this
        // const io = getIO();
        //groupData.users.forEach(username => {
        //    io.to(username).emit('group-profile-updated', {
        //        groupId,
        //        profilePicture: uploadResponse.secure_url
        //    });
        //});

        res.status(200).json({
          message: 'Group profile picture updated',
          url: uploadResponse.secure_url
        });
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
      }
    });
  } catch (error) {
    console.error('Error updating group profile picture:', error);
    res.status(500).json({ message: 'Failed to update group profile picture' });
  }
};

exports.getGroupInvites = async (req, res) => {
  try {
    const { username } = req.params;

    // Find all chat IDs where this user is a participant
    const friendsSnapshot = await db.collection('friends')
      .where('users', 'array-contains', username)
      .get();

    const chatIds = friendsSnapshot.docs.map(doc => doc.id);

    // For each chat, get group invites from the messages subcollection
    const invites = [];

    for (const chatId of chatIds) {
      const invitesSnapshot = await db.collection('friends')
        .doc(chatId)
        .collection('messages')
        .where('type', '==', 'group-invite')
        .where('receiverId', '==', username)
        .where('status', '==', 'sent')
        .get();

      invitesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        invites.push({
          id: doc.id,
          groupId: data.groupId,
          groupName: data.groupName,
          invitedBy: data.invitedBy,
          timestamp: data.timestamp.toDate().toISOString()
        });
      });
    }

    res.status(200).json(invites);
  } catch (error) {
    console.error('Error fetching group invites:', error);
    res.status(500).json({ message: 'Failed to fetch group invites' });
  }
};

exports.declineGroupInvite = async (req, res) => {
  try {
    const { inviteId, username, inviteStatus } = req.body;

    console.log(`[declineGroupInvite] Request received: inviteId=${inviteId}, username=${username}`);

    if (!inviteId) {
      console.log(`[declineGroupInvite] Error: Invite ID is required`);
      return res.status(400).json({ message: 'Invite ID is required' });
    }

    try {
      // Get all friends collections
      const friendsCollections = await db.collection('friends').get();
      let inviteFound = false;

      // Manually search through each friends collection's messages
      for (const friendDoc of friendsCollections.docs) {
        const messagesCollection = friendDoc.ref.collection('messages');
        const messagesQuery = await messagesCollection.where('id', '==', inviteId).get();

        if (!messagesQuery.empty) {
          // Update each matching invite message
          const batch = db.batch();
          messagesQuery.docs.forEach(doc => {
            const data = doc.data();
            // Only update if it's a group invite
            if (data.type === 'group-invite') {
              console.log(`[declineGroupInvite] Found invite message at path: ${doc.ref.path}`);
              batch.update(doc.ref, {
                status: inviteStatus || 'declined'
              });
              inviteFound = true;
            }
          });

          if (inviteFound) {
            await batch.commit();
            console.log(`[declineGroupInvite] Successfully updated invite status to declined`);
          }
        }
      }

      if (!inviteFound) {
        console.log(`[declineGroupInvite] No invite found with ID: ${inviteId}`);
        return res.status(404).json({ message: 'Invite not found' });
      }

      res.status(200).json({ message: 'Invite declined successfully' });
    } catch (queryError) {
      console.error('[declineGroupInvite] Error querying for invite:', queryError);
      return res.status(500).json({ message: 'Error querying for invite' });
    }
  } catch (error) {
    console.error('[declineGroupInvite] Error declining group invite:', error);
    res.status(500).json({ message: 'Failed to decline invite' });
  }
};

exports.getInviteStatus = async (req, res) => {
  try {
    const { inviteId } = req.params;
    const { username } = req.query;

    console.log(`[getInviteStatus] Request received for inviteId=${inviteId}, username=${username}`);

    if (!inviteId) {
      console.log(`[getInviteStatus] Error: Invite ID is required`);
      return res.status(400).json({ message: 'Invite ID is required' });
    }

    try {
      // Find the invite message in the database
      console.log(`[getInviteStatus] Querying for invite with ID: ${inviteId}`);

      // Use a more direct approach to find the message
      // First, get all friends collections
      const friendsCollections = await db.collection('friends').get();
      let inviteFound = false;
      let inviteData = null;

      // Manually search through each friends collection's messages
      for (const friendDoc of friendsCollections.docs) {
        const messagesCollection = friendDoc.ref.collection('messages');
        const messagesQuery = await messagesCollection.where('id', '==', inviteId).get();

        if (!messagesQuery.empty) {
          inviteFound = true;
          inviteData = messagesQuery.docs[0].data();
          console.log(`[getInviteStatus] Found invite in collection: ${friendDoc.id}`);
          break;
        }
      }

      if (!inviteFound || !inviteData) {
        console.log(`[getInviteStatus] No invite found with ID: ${inviteId}`);
        return res.status(404).json({ message: 'Invite not found', status: 'invalid' });
      }

      // Check if this is a group invite message
      if (inviteData.type !== 'group-invite') {
        console.log(`[getInviteStatus] Message with ID ${inviteId} is not a group invite`);
        return res.status(400).json({ message: 'Not a group invite', status: 'invalid' });
      }

      // Return the invite status
      console.log(`[getInviteStatus] Found invite status: ${inviteData.status || 'sent'}`);
      res.status(200).json({
        status: inviteData.status || 'sent',
        groupId: inviteData.groupId,
        groupName: inviteData.groupName,
        invitedBy: inviteData.invitedBy
      });
    } catch (queryError) {
      console.error(`[getInviteStatus] Error querying for invite:`, queryError);
      return res.status(500).json({
        message: 'Error querying for invite',
        status: 'invalid',
        error: queryError.message
      });
    }
  } catch (error) {
    console.error(`[getInviteStatus] Unexpected error:`, error);
    res.status(500).json({
      message: 'Failed to get invite status',
      status: 'invalid',
      error: error.message
    });
  }
};
