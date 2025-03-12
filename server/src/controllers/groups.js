const { db } = require("../config/firebase");
const { getIO } = require('../config/socket');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;
const { standardizeTimestamp } = require("../utils/dateUtils");

/**
 * Creates a new group chat
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createGroup = async (req, res) => {
  try {
    const { name, createdBy, includeCurrentEvent = true } = req.body;

    // Base group data
    const groupData = {
      name,
      createdBy,
      admin: createdBy,
      users: [createdBy],
      lastMessage: "",
      updatedAt: new Date(),
      createdAt: new Date()
    };

    // Add currentEvent field if requested
    if (includeCurrentEvent) {
      groupData.currentEvent = {
        id: "",
        title: "",
        date: "",
        description: "",
        expenses: []
      };
    }

    // Create the group
    const groupRef = await db.collection("groupChats").add(groupData);

    // Get user data for response
    const userDoc = await db.collection("users").doc(createdBy).get();
    const userData = userDoc.data();

    // Prepare response data
    const responseData = {
      id: groupRef.id,
      name,
      createdBy,
      admin: createdBy,
      users: [{
        username: createdBy,
        profilePicture: userData?.profilePicture || null,
        isAdmin: true
      }]
    };

    // Add currentEvent to response if included in the group
    if (includeCurrentEvent) {
      responseData.currentEvent = {
        id: "",
        title: "",
        date: "",
        description: "",
        expenses: []
      };
    }

    res.status(201).json(responseData);
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

    // If no groups found, return empty array
    if (groupsSnapshot.empty) {
      return res.status(200).json([]);
    }

    const groups = [];
    for (const doc of groupsSnapshot.docs) {
      const groupData = doc.data();

      // Skip fetching user details if there are no users
      if (!groupData.users || groupData.users.length === 0) {
        const group = {
          id: doc.id,
          name: groupData.name,
          admin: groupData.admin,
          users: [],
          createdBy: groupData.createdBy,
          createdAt: groupData.createdAt,
          updatedAt: groupData.updatedAt
        };
        groups.push(group);
        continue;
      }

      // Fetch all user details in a single query
      const userDocs = await db.collection("users").where("username", "in", groupData.users).get();
      const userDataMap = {};
      userDocs.forEach(doc => {
        userDataMap[doc.id] = doc.data();
      });

      // Map user data from the results
      const users = groupData.users.map(username => {
        const userData = userDataMap[username] || {};
        return {
          username,
          profilePicture: userData.profilePicture || null,
          venmoUsername: userData.venmoUsername || null,
          isAdmin: username === groupData.admin
        };
      });

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

exports.sendGroupMessage = async (req, res) => {
  console.log("groups.js")
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
      timestamp: standardizeTimestamp(messageDoc.data().timestamp)
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
      // Use the standardized timestamp utility function
      const timestamp = standardizeTimestamp(data.timestamp);

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

    // Handle case with no users
    if (!groupData.users || groupData.users.length === 0) {
      return res.status(200).json({
        id: groupId,
        name: groupData.name,
        admin: groupData.admin,
        users: [],
        createdBy: groupData.createdBy,
        createdAt: groupData.createdAt,
        updatedAt: groupData.updatedAt
      });
    }

    // Fetch all user details in a single query
    const userDocs = await db.collection("users").where("username", "in", groupData.users).get();
    const userDataMap = {};
    userDocs.forEach(doc => {
      userDataMap[doc.id] = doc.data();
    });

    // Map user data from the results
    const users = groupData.users.map(username => {
      const userData = userDataMap[username] || {};
      return {
        username,
        profilePicture: userData.profilePicture || null,
        isAdmin: username === groupData.admin
      };
    });

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
    const username = adminId; // Using adminId as the username for backward compatibility

    console.log(`[updateGroupChat] Request received for groupId=${groupId}, username=${username}`);

    const groupRef = db.collection("groupChats").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      console.log(`[updateGroupChat] Error: Group not found with ID ${groupId}`);
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();
    console.log(`[updateGroupChat] Group found: ${groupData.name}`);
    console.log(`[updateGroupChat] Group users:`, JSON.stringify(groupData.users));

    // Check if the user is in the group - handle different user data structures
    let userInGroup = false;

    if (Array.isArray(groupData.users)) {
      // Check if users are stored as objects with username property
      if (groupData.users.length > 0 && typeof groupData.users[0] === 'object') {
        userInGroup = groupData.users.some(user => user && user.username === username);
      }
      // Check if users are stored as strings
      else {
        userInGroup = groupData.users.includes(username);
      }
    }

    console.log(`[updateGroupChat] User ${username} is in group: ${userInGroup}`);

    // For now, allow all users to update the group for debugging
    // if (!userInGroup) {
    //   console.log(`[updateGroupChat] Error: User ${username} is not a member of the group`);
    //   return res.status(403).json({ message: "User is not a member of this group" });
    // }

    // Only admin can change admin
    if (newAdmin) {
      // Check if the current user is the admin
      const isAdmin = groupData.admin === username;
      if (!isAdmin) {
        console.log(`[updateGroupChat] Error: Only the admin can change the admin`);
        return res.status(403).json({ message: "Only the admin can change the admin" });
      }

      // Check if the new admin is in the group
      let newAdminInGroup = false;
      if (Array.isArray(groupData.users)) {
        if (groupData.users.length > 0 && typeof groupData.users[0] === 'object') {
          newAdminInGroup = groupData.users.some(user => user && user.username === newAdmin);
        } else {
          newAdminInGroup = groupData.users.includes(newAdmin);
        }
      }

      if (!newAdminInGroup) {
        console.log(`[updateGroupChat] Error: New admin ${newAdmin} is not a member of the group`);
        return res.status(400).json({ message: "New admin must be a member of the group" });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (newAdmin) updateData.admin = newAdmin;

    await groupRef.update(updateData);

    // Create a system message about the update
    let systemMessageContent = "";
    if (name) {
      systemMessageContent = `${username} changed the group name to "${name}"`;
    } else if (newAdmin) {
      systemMessageContent = `${username} made ${newAdmin} the new admin`;
    }

    if (systemMessageContent) {
      const systemMessageRef = await db.collection("groupChats")
        .doc(groupId)
        .collection("messages")
        .add({
          content: systemMessageContent,
          senderId: "system",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: "system"
        });

      const systemMessage = {
        id: systemMessageRef.id,
        content: systemMessageContent,
        senderId: "system",
        timestamp: new Date().toISOString(),
        type: "system"
      };

      // Emit a socket event to notify all group members
      const io = require('../config/socket').getIO();
      if (io) {
        // Get all members based on the data structure
        let members = [];
        if (Array.isArray(groupData.users)) {
          if (groupData.users.length > 0 && typeof groupData.users[0] === 'object') {
            members = groupData.users.map(user => user.username);
          } else {
            members = groupData.users;
          }
        }

        console.log(`[updateGroupChat] Notifying members:`, members);

        // Send system message to all members
        members.forEach(member => {
          io.to(member).emit('system-message', {
            groupId,
            message: systemMessage
          });
        });
      }
    }

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

    // Get socket instance early - use it throughout the function
    const io = getIO();

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

      // Even though the user is already in the group, we should still update the invite status
      // and return success to ensure the UI updates correctly
      if (inviteId) {
        try {
          await updateInviteStatus(inviteId, inviteStatus || 'accepted', username, groupId, io);
        } catch (inviteError) {
          console.error('[joinGroup] Error updating invite status:', inviteError);
          // Continue with the response even if updating the invite fails
        }
      }

      // Get user details for response
      const userDocs = await db.collection("users").where("username", "in", groupData.users).get();
      const userDataMap = {};
      userDocs.forEach(doc => {
        userDataMap[doc.id] = doc.data();
      });

      // Map user data from the results
      const users = groupData.users.map(username => {
        const userData = userDataMap[username] || {};
        return {
          username,
          profilePicture: userData.profilePicture || null,
          isAdmin: username === groupData.admin
        };
      });

      // Return success with the current group data
      return res.status(200).json({
        id: groupId,
        name: groupData.name,
        users,
        admin: groupData.admin,
        createdBy: groupData.createdBy,
        createdAt: groupData.createdAt,
        updatedAt: groupData.updatedAt,
        imageUrl: groupData.imageUrl,
        currentEvent: groupData.currentEvent || {
          id: "",
          title: "",
          date: "",
          description: "",
          expenses: []
        }
      });
    }

    // Add user to group
    console.log(`[joinGroup] Adding user ${username} to group ${groupId}`);
    await groupRef.update({
      users: [...groupData.users, username]
    });

    // Add system message for user joining
    const systemMessage = {
      content: `${username} joined the group`,
      senderId: 'system',
      senderName: 'System',
      timestamp: new Date(),
      type: 'system'
    };

    // Add to database
    const systemMessageRef = await groupRef.collection('messages').add(systemMessage);

    // Get the message ID
    const systemMessageId = systemMessageRef.id;

    // Emit system message to all users in the group
    [...groupData.users, username].forEach(user => {
      io.to(user).emit('system-message', {
        groupId,
        message: {
          ...systemMessage,
          id: systemMessageId,
          chatId: groupId,
          timestamp: systemMessage.timestamp.toISOString(),
          status: 'sent'
        }
      });
    });

    // Update invite status in the database if inviteId is provided
    if (inviteId) {
      try {
        await updateInviteStatus(inviteId, inviteStatus || 'accepted', username, groupId, io);
      } catch (inviteError) {
        console.error('[joinGroup] Error updating invite status:', inviteError);
        // Continue with the join process even if updating the invite fails
      }
    }

    // Get updated group data
    const updatedGroupDoc = await groupRef.get();
    const updatedData = updatedGroupDoc.data();

    // Handle case with no users (shouldn't happen here but adding for safety)
    if (updatedData.users.length === 0) {
      // Ensure currentEvent is included in the response
      let currentEvent = null;
      if (updatedData.currentEvent) {
        currentEvent = {
          id: updatedData.currentEvent.id || "",
          title: updatedData.currentEvent.title || "",
          date: updatedData.currentEvent.date || "",
          description: updatedData.currentEvent.description || "",
          expenses: updatedData.currentEvent.expenses || []
        };
      }

      return res.status(200).json({
        id: groupId,
        name: updatedData.name,
        admin: updatedData.admin,
        users: [],
        createdBy: updatedData.createdBy,
        createdAt: updatedData.createdAt,
        updatedAt: updatedData.updatedAt,
        currentEvent
      });
    }

    // Fetch user details for response
    const userDocs = await db.collection("users").where("username", "in", updatedData.users).get();
    const userDataMap = {};
    userDocs.forEach(doc => {
      userDataMap[doc.id] = doc.data();
    });

    // Map user data from the results
    const users = updatedData.users.map(username => {
      const userData = userDataMap[username] || {};
      return {
        username,
        profilePicture: userData.profilePicture || null,
        isAdmin: username === updatedData.admin
      };
    });

    // Ensure currentEvent is included in the response
    const currentEvent = updatedData.currentEvent || {
      id: "",
      title: "",
      date: "",
      description: "",
      expenses: []
    };

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
          imageUrl: updatedData.imageUrl,
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
      imageUrl: updatedData.imageUrl,
      currentEvent
    });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ message: 'Failed to join group' });
  }
};

// Helper function to update invite status
async function updateInviteStatus(inviteId, status, username, groupId, io) {
  console.log(`[updateInviteStatus] Updating invite status for invite ${inviteId} to ${status}`);

  // Get all friends collections
  const friendsCollections = await db.collection('friends').get();
  let inviteFound = false;
  let extractedGroupId = groupId;

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
          console.log(`[updateInviteStatus] Found invite message at path: ${doc.ref.path}`);
          batch.update(doc.ref, {
            status: status
          });
          inviteFound = true;

          // Extract groupId from the message if not provided
          if (!extractedGroupId && data.groupId) {
            extractedGroupId = data.groupId;
          }
        }
      });

      if (inviteFound) {
        await batch.commit();
        console.log(`[updateInviteStatus] Successfully updated invite status`);

        // Use the provided io instance or get a new one if not provided
        const socketIo = io || getIO();

        // Emit an event to notify the client that the invite status has changed
        if (username && extractedGroupId) {
          socketIo.to(username).emit('invite-status-updated', {
            inviteId,
            status: status,
            groupId: extractedGroupId
          });
        } else {
          console.log(`[updateInviteStatus] Warning: Could not emit event, missing username or groupId`);
        }
      }
    }
  }

  if (!inviteFound) {
    console.log(`[updateInviteStatus] No invite found with ID: ${inviteId}`);
  }

  return inviteFound;
}

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
    const invites = [];

    // Find all chat IDs where this user is a participant
    const friendsSnapshot = await db.collection('friends')
      .where('users', 'array-contains', username)
      .get();

    const chatIds = friendsSnapshot.docs.map(doc => doc.id);

    // For each chat, get group invites from the messages subcollection
    for (const chatId of chatIds) {
      const invitesSnapshot = await db.collection('friends')
        .doc(chatId)
        .collection('messages')
        .where('type', '==', 'group-invite')
        .where('receiverId', '==', username)
        .where('status', '==', 'sent')
        .get();

      if (!invitesSnapshot.empty) {
        invitesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          invites.push({
            id: doc.id,
            groupId: data.groupId,
            groupName: data.groupName,
            invitedBy: data.invitedBy,
            timestamp: standardizeTimestamp(data.timestamp)
          });
        });
      }
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
      // Get socket instance
      const io = getIO();

      // Use the updateInviteStatus helper function
      const inviteFound = await updateInviteStatus(
        inviteId,
        inviteStatus || 'declined',
        username,
        null, // We don't know the groupId yet, but it will be extracted in the function
        io
      );

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

// Add the controller function for updating group images
/*exports.updateGroupImage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { username } = req.body;

    console.log(`[updateGroupImage] Request received for groupId=${groupId}, username=${username}`);

    if (!username) {
      console.log(`[updateGroupImage] Error: Username is required`);
      return res.status(400).json({ message: "Username is required" });
    }

    // Check if the group exists
    const groupRef = db.collection("groupChats").doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      console.log(`[updateGroupImage] Error: Group not found with ID ${groupId}`);
      return res.status(404).json({ message: "Group not found" });
    }

    const groupData = groupDoc.data();
    console.log(`[updateGroupImage] Group found: ${groupData.name}`);
    console.log(`[updateGroupImage] Group users:`, JSON.stringify(groupData.users));

    // Check if the user is in the group - handle different user data structures
    let userInGroup = false;

    if (Array.isArray(groupData.users)) {
      // Check if users are stored as objects with username property
      if (groupData.users.length > 0 && typeof groupData.users[0] === 'object') {
        userInGroup = groupData.users.some(user => user && user.username === username);
      }
      // Check if users are stored as strings
      else {
        userInGroup = groupData.users.includes(username);
      }
    }

    console.log(`[updateGroupImage] User ${username} is in group: ${userInGroup}`);

    // For now, allow all users to update the group image for debugging
    // if (!userInGroup) {
    //   console.log(`[updateGroupImage] Error: User ${username} is not a member of the group`);
    //   return res.status(403).json({ message: "User is not a member of this group" });
    // }

    // If there's an image file
    if (req.file) {
      try {
        // Upload to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(
          `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
          {
            folder: 'group_pictures',
            public_id: `group-${groupId}-${Date.now()}`
          }
        );

        // Delete old image if it exists
        if (groupData.imageUrl) {
          try {
            const oldImageUrl = groupData.imageUrl;
            // Extract the public ID from the URL
            const publicId = oldImageUrl.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`group_pictures/${publicId}`);
          } catch (error) {
            console.error("Error deleting old image:", error);
            // Continue with the update even if deletion fails
          }
        }

        // Get the secure URL from the upload response
        const imageUrl = uploadResponse.secure_url;

        // Update the group document with the new image URL
        await groupRef.update({
          imageUrl,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Create a system message about the image update
        const systemMessageRef = await db.collection("groupChats")
          .doc(groupId)
          .collection("messages")
          .add({
            content: `${username} updated the group image`,
            senderId: "system",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            type: "system"
          });

        const systemMessage = {
          id: systemMessageRef.id,
          content: `${username} updated the group image`,
          senderId: "system",
          timestamp: new Date().toISOString(),
          type: "system"
        };

        // Get the updated group data
        const updatedGroupDoc = await groupRef.get();
        const updatedGroupData = updatedGroupDoc.data();

        // Emit a socket event to notify all group members
        const io = require('../config/socket').getIO();
        if (io) {
          // Get all members based on the data structure
          let members = [];
          if (Array.isArray(updatedGroupData.users)) {
            if (updatedGroupData.users.length > 0 && typeof updatedGroupData.users[0] === 'object') {
              members = updatedGroupData.users.map(user => user.username);
            } else {
              members = updatedGroupData.users;
            }
          }

          console.log(`[updateGroupImage] Notifying ${members.length} members:`, members);

          // First, broadcast to all connected clients to ensure everyone gets the update
          console.log(`[updateGroupImage] Broadcasting update to all connected clients`);
          io.emit('broadcast-group-update', {
            groupId,
            imageUrl,
            updatedBy: username,
            members,
          });

          // Then, also send direct messages to each member for redundancy
          members.forEach(member => {
            console.log(`[updateGroupImage] Sending direct update to ${member}`);
            io.to(member).emit('group-updated', {
              groupId,
              imageUrl,
              updatedBy: username,
              members,
            });
          });

          // Send system message to all members
          members.forEach(member => {
            io.to(member).emit('system-message', {
              groupId,
              message: systemMessage
            });
          });
        }

        return res.status(200).json({
          message: "Group image updated successfully",
          url: imageUrl
        });
      } catch (uploadError) {
        console.error("Error uploading to Cloudinary:", uploadError);
        return res.status(500).json({ message: "Error uploading image" });
      }
    }

    return res.status(400).json({ message: "No image file provided" });
  } catch (error) {
    console.error("Error updating group image:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};*/

// Add this function to mark group messages as read
exports.markGroupMessagesAsRead = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId, messageIds } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // If no messageIds provided, just return success
    if (!messageIds || messageIds.length === 0) {
      return res.status(200).json({ message: "No messages to mark as read" });
    }

    const batch = db.batch();
    const io = getIO();

    // Get the group messages collection
    const messagesRef = db.collection("groups")
      .doc(groupId)
      .collection("messages");

    // Get all messages that need to be marked as read
    const messagesSnapshot = await messagesRef
      .where("status", "==", "sent")
      .get();

    messagesSnapshot.forEach(doc => {
      // Only update if the message is in the provided messageIds
      if (messageIds.includes(doc.id)) {
        const messageData = doc.data();
        const readBy = messageData.readBy || [];

        // Only update if the user hasn't already read the message
        if (!readBy.includes(userId)) {
          batch.update(doc.ref, {
            readBy: [...readBy, userId],
            status: 'read'
          });

          // Emit message-read event to notify other clients
          io.to(groupId).emit('message-read', {
            groupId,
            messageId: doc.id,
            readBy: [...readBy, userId]
          });
        }
      }
    });

    await batch.commit();
    res.status(200).json({ message: "Group messages marked as read!" });
  } catch (error) {
    console.error("Error marking group messages as read:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
