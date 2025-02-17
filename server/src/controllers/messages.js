const { db } = require("../config/firebase");
const { getIO } = require("../config/socket");


// Check if two users are friends
const areUsersFriends = async (user1, user2) => {
    const docId = [user1, user2].sort().join("_"); // Standardized ID for friend collection
    const friendDoc = await db.collection("friends").doc(docId).get();
    return friendDoc.exists; // Returns true if they are friends
};

// Send a message (either direct chat or request)
const sendMessage = async (req, res) => {
    try {
        const { chatId, senderId, receiverId, content } = req.body;

        // Create message document
        const messageRef = await db.collection('chats')
            .doc(chatId)
            .collection('messages')
            .add({
                senderId,
                content,
                timestamp: new Date(),
                status: 'sent'
            });

        // Update or create chat document
        await db.collection('chats').doc(chatId).set({
            users: [senderId, receiverId],
            lastMessage: content,
            lastMessageTime: new Date(),
            updatedAt: new Date()
        }, { merge: true });

        const messageData = {
            id: messageRef.id,
            senderId,
            receiverId,
            content,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        // Emit socket event
        const io = getIO();
        io.to(receiverId).to(senderId).emit('new-message', {
            chatId,
            message: messageData
        });

        res.status(200).json({
            messageId: messageRef.id,
            message: 'Message sent successfully'
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
};

// Get messages from a conversation
const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        const messagesRef = await db.collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .get();

        const messages = messagesRef.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate().toISOString()
        }));

        res.status(200).json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
};

// Mark messages as read (for a specific user)
const markMessagesAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const messagesSnapshot = await db.collection("chats")
            .doc(chatId)
            .collection("messages")
            .where("status", "==", "sent")
            .get();

        if (messagesSnapshot.empty) {
            return res.status(404).json({ message: "No unread messages found" });
        }

        const batch = db.batch();
        messagesSnapshot.forEach(doc => {
            const messageData = doc.data();
            const readBy = messageData.readBy || []; // Ensure readBy is an array

            if (!readBy.includes(userId)) {
                batch.update(doc.ref, { readBy: [...readBy, userId] });
            }
        });

        await batch.commit();

        res.status(200).json({ message: "Messages marked as read!" });
    } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Delete a message (soft delete)
const deleteMessage = async (req, res) => {
    try {
        const { chatId, messageId, userId } = req.body;

        const messageRef = db.collection("chats").doc(chatId).collection("messages").doc(messageId);
        const messageDoc = await messageRef.get();

        if (!messageDoc.exists) {
            return res.status(404).json({ message: "Message not found" });
        }

        const messageData = messageDoc.data();
        if (messageData.senderId !== userId) {
            return res.status(403).json({ message: "You can only delete your own messages" });
        }

        await messageRef.update({ deleted: true, content: "This message has been deleted." });

        res.status(200).json({ message: "Message deleted!" });
    } catch (error) {
        console.error("Error deleting message:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Accept a message request (move to direct chat)
const acceptMessageRequest = async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const requestChatId = [senderId, receiverId].sort().join("_");

        const requestRef = db.collection("messageRequests").doc(requestChatId);
        const messagesSnapshot = await requestRef.collection("messages").get();

        if (messagesSnapshot.empty) {
            return res.status(404).json({ message: "No message request found." });
        }

        // Move messages to direct chat
        const batch = db.batch();
        messagesSnapshot.forEach((doc) => {
            batch.set(db.collection("chats").doc(requestChatId).collection("messages").doc(doc.id), doc.data());
            batch.delete(doc.ref); // Delete from messageRequests
        });

        // Set up chat metadata
        batch.set(db.collection("chats").doc(requestChatId), {
            users: [senderId, receiverId],
            lastMessage: "Accepted message request",
            updatedAt: new Date(),
        });

        await batch.commit();

        // Ensure the message request document is deleted
        await requestRef.delete();

        res.status(200).json({ message: "Message request accepted! You can now chat directly." });
    } catch (error) {
        console.error("Error accepting message request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Reject a message request
const rejectMessageRequest = async (req, res) => {
    try {
        const { senderId, receiverId } = req.body;
        const requestChatId = [senderId, receiverId].sort().join("_");

        const requestRef = db.collection("messageRequests").doc(requestChatId);
        const messagesSnapshot = await requestRef.collection("messages").get();

        if (messagesSnapshot.empty) {
            return res.status(404).json({ message: "No message request found." });
        }

        // Delete all messages in the message request
        const batch = db.batch();
        messagesSnapshot.forEach((doc) => batch.delete(doc.ref));
        batch.delete(requestRef); // Delete the request document itself

        await batch.commit();

        res.status(200).json({ message: "Message request rejected!" });
    } catch (error) {
        console.error("Error rejecting message request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = { sendMessage, getMessages, markMessagesAsRead, deleteMessage, acceptMessageRequest, rejectMessageRequest };