const { db } = require("../config/firebase");
const { getIO } = require("../config/socket");
const { getUserGroups } = require("./groups");

// Create a group chat
const createGroupChat = async (req, res) => {
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
            createdAt: new Date()
        });

        // Get creator's data for the response only
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
            }]
        });
    } catch (error) {
        console.error("Error creating group chat:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Send a message in a group chat
const sendGroupMessage = async (req, res) => {
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

        console.log(`Admin in DB: ${groupData.admin}, Admin in Request: ${adminId}`);

        if (groupData.admin !== adminId) {
            return res.status(403).json({ message: "Only the admin can remove users." });
        }

        if (!groupData.users.includes(userId)) {
            return res.status(400).json({ message: "User is not in the group" });
        }

        const updatedUsers = groupData.users.filter(user => user !== userId);
        await groupRef.update({ users: updatedUsers });

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
        const { groupId, adminId } = req.body;
        if (!groupId || !adminId) {
            return res.status(400).json({ message: "Missing fields" });
        }

        const groupRef = db.collection("groupChats").doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ message: "Group not found" });
        }

        const groupData = groupDoc.data();

        console.log(`Admin in DB: ${groupData.admin}, Admin in Request: ${adminId}`);

        if (groupData.admin !== adminId) {
            return res.status(403).json({ message: "Only the admin can delete the group." });
        }

        await groupRef.delete();
        res.status(200).json({ message: "Group deleted successfully!" });
    } catch (error) {
        console.error("Error deleting group:", error);
        res.status(500).json({ message: "Internal server error" });
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

// Pin a message in the group (admin only)
const pinGroupMessage = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { adminId, messageId } = req.body;

        const groupRef = db.collection("groupChats").doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ message: "Group not found" });
        }

        const groupData = groupDoc.data();
        if (groupData.admin !== adminId) {
            return res.status(403).json({ message: "Only the admin can pin messages" });
        }

        await groupRef.update({ pinnedMessage: messageId });

        res.status(200).json({ message: "Message pinned successfully!" });
    } catch (error) {
        console.error("Error pinning message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Create a new group
const createGroup = async (req, res) => {
    try {
        const { name, createdBy } = req.body;

        const groupRef = await db.collection("groupChats").add({
            name,
            createdBy,
            admin: createdBy,
            users: [createdBy], // Just store username
            createdAt: new Date(),
            updatedAt: new Date(),
            lastMessage: "",
            lastMessageTime: null
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
            }]
        });
    } catch (error) {
        console.error("Error creating group:", error);
        res.status(500).json({ message: "Failed to create group" });
    }
};

const sendGroupInvite = async (req, res) => {
    try {
        const { groupId, username } = req.body;

        // Verify group exists
        const groupRef = db.collection('groupChats').doc(groupId);
        const groupDoc = await groupRef.get();

        if (!groupDoc.exists) {
            return res.status(404).json({ message: 'Group not found' });
        }

        // Check if user exists
        const userDoc = await db.collection('users').doc(username).get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        const groupData = groupDoc.data();

        // Check if inviter is the admin
        if (username === groupData.admin) {
            return res.status(400).json({ message: 'Cannot invite yourself to the group' });
        }

        // Check if user is already in group
        if (groupData.users.includes(username)) {
            return res.status(400).json({ message: 'User is already in the group' });
        }

        // Get socket instance
        const io = getIO();

        // Emit socket event
        io.to(username).emit('group-invite', {
            id: groupId,
            groupId,
            groupName: groupData.name,
            invitedBy: groupData.admin
        });

        res.status(200).json({ message: 'Invite sent successfully' });
    } catch (error) {
        console.error('Error sending group invite:', error);
        res.status(500).json({ message: 'Failed to send invite' });
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

module.exports = {
    // Group creation and management
    createGroup,
    createGroupChat,
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
    setGroupEvent
};