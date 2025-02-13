const { db } = require("../config/firebase");

// Send a message
const sendMessage = async (req, res) => {
    try {
        const { senderId, receiverId, content } = req.body;
        if (!senderId || !receiverId || !content) {
            return res.status(400).json({ message: "Missing fields" });
        }

        // Ensure chat ID is always consistent (sorted IDs)
        const chatId = [senderId, receiverId].sort().join("_");

        // Store message in Firestore
        const newMessage = {
            senderId,
            receiverId,
            content,
            timestamp: new Date(),
            status: "sent"
        };

        await db.collection("chats").doc(chatId).collection("messages").add(newMessage);

        // Update last message in chat metadata
        await db.collection("chats").doc(chatId).set({
            users: [senderId, receiverId],
            lastMessage: content,
            updatedAt: new Date()
        }, { merge: true });

        res.status(200).json({ message: "Message sent!" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get messages from a conversation
const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { lastMessageId } = req.query;

        let query = db.collection("chats")
            .doc(chatId)
            .collection("messages")
            .orderBy("timestamp", "asc")
            .limit(20); // Retrieve 20 messages at a time

        if (lastMessageId) {
            const lastMessageRef = await db.collection("chats")
                .doc(chatId)
                .collection("messages")
                .doc(lastMessageId)
                .get();
            if (lastMessageRef.exists) {
                query = query.startAfter(lastMessageRef);
            }
        }

        const messagesSnapshot = await query.get();
        const messages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate().toISOString()
        }));

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Internal server error" });
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

module.exports = { sendMessage, getMessages, markMessagesAsRead, deleteMessage };