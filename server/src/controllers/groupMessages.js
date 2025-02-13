const { db } = require("../config/firebase");

// Create a group chat
const createGroupChat = async (req, res) => {
    try {
        const { name, createdBy, users } = req.body;
        if (!name || !createdBy || !users || users.length < 2) {
            return res.status(400).json({ message: "Invalid group data. At least two users required." });
        }

        const groupRef = await db.collection("groupChats").add({
            name,
            createdBy,
            admin: createdBy,
            users,
            lastMessage: "",
            updatedAt: new Date(),
        });

        res.status(201).json({ groupId: groupRef.id, message: "Group chat created!" });
    } catch (error) {
        console.error("Error creating group chat:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Send a message in a group chat
const sendGroupMessage = async (req, res) => {
    try {
        const { groupId, senderId, content } = req.body;
        if (!groupId || !senderId || !content) {
            return res.status(400).json({ message: "Missing fields" });
        }

        const groupRef = db.collection("groupChats").doc(groupId);
        const groupDoc = await groupRef.get();
        if (!groupDoc.exists) {
            return res.status(404).json({ message: "Group chat not found." });
        }

        const newMessage = {
            senderId,
            content,
            timestamp: new Date(),
            status: "sent",
        };

        await groupRef.collection("messages").add(newMessage);
        await groupRef.update({
            lastMessage: content,
            updatedAt: new Date(),
        });

        res.status(200).json({ message: "Message sent to group!" });
    } catch (error) {
        console.error("Error sending group message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get messages from a group chat
const getGroupMessages = async (req, res) => {
    try {
        const { groupId } = req.params;

        const messagesSnapshot = await db.collection("groupChats")
            .doc(groupId)
            .collection("messages")
            .orderBy("timestamp", "asc")
            .get();

        if (messagesSnapshot.empty) {
            return res.status(404).json({ message: "No messages found in this group chat." });
        }

        const messages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate().toISOString()
        }));

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching group messages:", error);
        res.status(500).json({ message: "Internal server error" });
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

        await groupRef.update({
            users: [...groupData.users, userId],
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

        res.status(200).json({ groupId, ...groupDoc.data() });
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


module.exports = { createGroupChat, sendGroupMessage, getGroupMessages, addUserToGroup, removeUserFromGroup, leaveGroup, deleteGroup, getGroupDetails, updateGroupChat, pinGroupMessage };