const { db } = require("../config/firebase");
const { getIO } = require("../config/socket");
const { getUserGroups, createGroup } = require("./groups");

// Send a message in a group chat
const sendGroupMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { content, senderId } = req.body;

        const groupRef = db.collection('groupChats').doc(groupId);

        // Verify group exists
        const groupDoc = await groupRef.get();
        if (!groupDoc.exists) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Add message to database
        const messageRef = await groupRef.collection('messages').add({
            content,
            senderId,
            timestamp: new Date(),
            system: false,
            status: 'sent',
            readBy: [senderId]
        });

        const message = {
            id: messageRef.id,
            content,
            senderId,
            timestamp: new Date().toISOString(),
            status: 'sent',
            readBy: [senderId]
        };

        // Emit to all group members
        const io = getIO();
        io.to(`group_${groupId}`).emit('group_message', {
            groupId,
            message
        });

        res.status(200).json(message);
    } catch (error) {
        console.error('Error sending group message:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
};

// Get messages from a group chat
const getGroupMessages = async (req, res) => {
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

// Add a user to a group chat (Only admin can do this)
const addUserToGroup = async (req, res) => {
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

// Remove a user from the group (Only admin can remove members)
const removeUserFromGroup = async (req, res) => {
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


// Leave a group (User removes themselves)
const leaveGroup = async (req, res) => {
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

// Delete the group (Only admin can delete)
const deleteGroup = async (req, res) => {
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

// Get group details
const getGroupDetails = async (req, res) => {
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

// Update group chat (admin can change name, description, and assign a new admin)
const updateGroupChat = async (req, res) => {
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

const sendGroupInvite = async (req, res) => {
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

const joinGroup = async (req, res) => {
    try {
        const { groupId, username } = req.body;
        const groupRef = db.collection('groupChats').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ message: 'Group not found' });
        }

        const groupData = groupDoc.data();

        // Check if user is the admin/creator of the group
        if (username === groupData.admin) {
            return res.status(400).json({
                message: 'Cannot accept your own invite'
            });
        }

        // Check if user is already in group
        if (groupData.users.includes(username)) {
            return res.status(400).json({
                message: 'You are already a member of this group'
            });
        }

        // Add user to group
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

        const groupResponse = {
            id: groupId,
            name: updatedData.name,
            admin: updatedData.admin,
            users: users,
            createdBy: updatedData.createdBy,
            createdAt: updatedData.createdAt,
            updatedAt: updatedData.updatedAt
        };

        // Get socket instance
        const io = getIO();

        // Notify all group members including the new member
        [...updatedData.users].forEach(member => {
            io.to(member).emit('group-invite-accepted', {
                groupId,
                username,
                group: groupResponse
            });
        });

        res.status(200).json({
            message: 'Successfully joined group',
            group: groupResponse
        });
    } catch (error) {
        console.error('Error joining group:', error);
        res.status(500).json({ message: 'Failed to join group' });
    }
};

// Add event-related functions
const setGroupEvent = async (req, res) => {
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

// Add this function to check group status
const checkGroupStatus = async (req, res) => {
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

// Update read status handling for groups
const markGroupMessageAsRead = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;

        const groupRef = db.collection('groupChats').doc(groupId);

        // Get all messages in order
        const messagesSnapshot = await groupRef.collection('messages')
            .orderBy('timestamp', 'asc')
            .get();

        const batch = db.batch();
        const io = getIO();
        const updatedMessages = [];

        // Track the latest message read
        let latestMessageRead = null;

        messagesSnapshot.forEach(doc => {
            const messageData = doc.data();
            const readBy = new Set(messageData.readBy || []);

            if (!readBy.has(userId)) {
                readBy.add(userId);
                const updatedReadBy = Array.from(readBy);
                batch.update(doc.ref, { readBy: updatedReadBy });

                updatedMessages.push({
                    messageId: doc.id,
                    readBy: updatedReadBy
                });
                latestMessageRead = doc.id;
            }
        });

        await batch.commit();

        // Emit updates for all messages that were modified
        if (updatedMessages.length > 0) {
            // First, notify about all previous messages
            updatedMessages.slice(0, -1).forEach(({ messageId, readBy }) => {
                io.to(`group_${groupId}`).emit('group_message_update', {
                    groupId,
                    messageId,
                    readBy,
                    isLatest: false
                });
            });

            // Then, notify about the latest message read
            const lastUpdate = updatedMessages[updatedMessages.length - 1];
            io.to(`group_${groupId}`).emit('group_message_update', {
                groupId,
                messageId: lastUpdate.messageId,
                readBy: lastUpdate.readBy,
                isLatest: true
            });
        }

        res.status(200).json({
            message: 'Messages marked as read',
            latestMessageRead
        });
    } catch (error) {
        console.error('Error marking group messages as read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    // Group creation and management (import createGroup from groups.js)
    createGroup,
    deleteGroup,
    updateGroupChat,

    // Group membership
    addUserToGroup,
    removeUserFromGroup,
    leaveGroup,

    // Group messages
    sendGroupMessage,
    getGroupMessages,
    pinGroupMessage,

    // Group info
    getGroupDetails,
    sendGroupInvite,
    joinGroup,

    // Event-related functions
    setGroupEvent,

    // Add this function to check group status
    checkGroupStatus,

    // Update read status handling for groups
    markGroupMessageAsRead
};