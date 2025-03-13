const { db } = require("../config/firebase");
const { getIO } = require("../config/socket");
const admin = require("firebase-admin");
const { standardizeTimestamp } = require("../utils/dateUtils");
const { cloudinary } = require('../config/cloudinary');
const streamifier = require('streamifier');

// Check if two users are friends
const areUsersFriends = async (user1, user2) => {
    const docId = [user1, user2].sort().join("_"); // Standardized ID for friend collection
    const friendDoc = await db.collection("friends").doc(docId).get();
    return friendDoc.exists; // Returns true if they are friends
};

// Send a message (either direct chat or request)
const sendMessage = async (req, res) => {
    try {
        const { chatId, content, senderId, receiverId } = req.body;

        // Add message to friends collection
        const messageRef = await db.collection('friends')
            .doc(chatId)
            .collection('messages')
            .add({
                content,
                senderId,
                receiverId,
                timestamp: new Date(),
                status: 'sent'
            });

        const message = {
            id: messageRef.id,
            content,
            senderId,
            receiverId,
            timestamp: new Date().toISOString(),
            status: 'sent'
        };

        // Emit to both users
        const io = getIO();
        io.to(receiverId).to(senderId).emit('new-message', {
            chatId,
            message
        });

        res.status(200).json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
};

// Send a message with an image
const sendImageMessage = async (req, res) => {
    try {
        const { chatId, senderId, receiverId } = req.params;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No image uploaded' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG and GIF are allowed.' });
        }

        try {
            // Upload file to Cloudinary
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'chat_images',
                        public_id: `chat-${chatId}-${Date.now()}`,
                        resource_type: 'auto'
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );

                streamifier.createReadStream(file.buffer).pipe(uploadStream);
            });

            const uploadResult = await uploadPromise;

            // Store the Cloudinary URL
            const imageUrl = uploadResult.secure_url;

            // Log the URL for debugging
            console.log(`Generated chat image URL: ${imageUrl}`);

            // Add message to friends collection
            const messageRef = await db.collection('friends')
                .doc(chatId)
                .collection('messages')
                .add({
                    type: 'image',
                    imageUrl: imageUrl,
                    senderId,
                    receiverId,
                    timestamp: new Date(),
                    status: 'sent'
                });

            const message = {
                id: messageRef.id,
                type: 'image',
                imageUrl: imageUrl,
                senderId,
                receiverId,
                timestamp: new Date().toISOString(),
                status: 'sent'
            };

            // Emit to both users
            const io = getIO();
            io.to(receiverId).to(senderId).emit('new-message', {
                chatId,
                message
            });

            res.status(200).json(message);
        } catch (error) {
            console.error('Error uploading image:', error);
            return res.status(500).json({ message: 'Failed to upload image' });
        }
    } catch (error) {
        console.error('Error processing image message:', error);
        return res.status(500).json({ message: 'Failed to send image message' });
    }
};

// Get messages for a chat
const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        // Get messages from the messages subcollection of the friends collection
        const messagesSnapshot = await db.collection('friends')
            .doc(chatId)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .get();

        const messages = messagesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: standardizeTimestamp(data.timestamp)
            };
        });

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
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

        const messagesSnapshot = await db.collection("friends")
            .doc(chatId)
            .collection("messages")
            .where("status", "==", "sent")
            .get();

        const batch = db.batch();
        const io = getIO();

        messagesSnapshot.forEach(doc => {
            const messageData = doc.data();
            const readBy = messageData.readBy || [];

            if (!readBy.includes(userId)) {
                batch.update(doc.ref, {
                    readBy: [...readBy, userId],
                    status: 'read'
                });

                io.to(messageData.senderId).emit('message-read', {
                    chatId,
                    messageId: doc.id,
                    readBy: [...readBy, userId]
                });
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

        const messageRef = db.collection("friends").doc(chatId).collection("messages").doc(messageId);
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
            batch.set(db.collection("friends").doc(requestChatId).collection("messages").doc(doc.id), doc.data());
            batch.delete(doc.ref); // Delete from messageRequests
        });

        // Set up chat metadata
        batch.set(db.collection("friends").doc(requestChatId), {
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

module.exports = {
    sendMessage,
    sendImageMessage,
    getMessages,
    markMessagesAsRead,
    deleteMessage,
    acceptMessageRequest,
    rejectMessageRequest
};