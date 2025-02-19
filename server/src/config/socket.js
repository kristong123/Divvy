const { Server } = require("socket.io");
const corsOptions = require("./corsOptions");
const { db } = require("./firebase");

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: corsOptions,
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    });

    io.on('connection', (socket) => {
        // Only log actual user connections
        socket.on('join', (username) => {
            if (username) {
                console.log(`User connected: ${username} (${socket.id})`);
                socket.join(username);
            }
        });

        socket.on('private-message', async (data) => {
            try {
                // Get sender's profile
                const senderDoc = await db.collection('users').doc(data.message.senderId).get();
                const senderData = senderDoc.data();

                // Save message with sender info
                const messageRef = await db.collection('friends')
                    .doc(data.chatId)
                    .collection('messages')
                    .add({
                        content: data.message.content,
                        senderId: data.message.senderId,
                        senderName: data.message.senderId, // Username as name
                        senderProfile: senderData?.profilePicture || null,
                        timestamp: new Date(),
                        status: 'sent'
                    });

                const message = {
                    id: messageRef.id,
                    ...data.message,
                    senderName: data.message.senderId,
                    senderProfile: senderData?.profilePicture || null,
                    timestamp: new Date().toISOString()
                };

                // Emit to both sender and recipient rooms
                io.to(data.message.receiverId).to(data.message.senderId).emit('new-message', {
                    chatId: data.chatId,
                    message
                });
            } catch (error) {
                console.error('Error handling private message:', error);
                socket.emit('message-error', { error: 'Failed to save message' });
            }
        });

        socket.on('leave', (username) => {
            socket.leave(username);
            console.log(`${username} left their room`);
        });

        // Friend requests
        socket.on('friend-request-sent', async (data) => {
            try {
                const { sender, recipient } = data;

                // Get both users' profile data
                const [senderDoc, recipientDoc] = await Promise.all([
                    db.collection('users').doc(sender).get(),
                    db.collection('users').doc(recipient).get()
                ]);
                const senderData = senderDoc.data();
                const recipientData = recipientDoc.data();

                if (!recipientDoc.exists) {
                    socket.emit('error', { message: 'User not found' });
                    return;
                }

                // Check if request already exists
                const existingRequest = await db.collection('friendRequests')
                    .where('sender', '==', sender)
                    .where('recipient', '==', recipient)
                    .get();

                if (!existingRequest.empty) {
                    console.log('Request already exists');
                    return;
                }

                // Create new request with just the essential data
                const requestRef = await db.collection('friendRequests').add({
                    sender,
                    recipient,
                    status: 'pending',
                    createdAt: new Date()
                });

                // Send different profile pictures to each user
                const recipientEventData = {
                    id: requestRef.id,
                    sender,
                    recipient,
                    timestamp: new Date().toISOString(),
                    profilePicture: senderData.profilePicture || null
                };

                const senderEventData = {
                    id: requestRef.id,
                    sender,
                    recipient,
                    timestamp: new Date().toISOString(),
                    profilePicture: recipientData.profilePicture || null
                };

                // Emit to recipient and sender with appropriate profile pictures
                io.to(recipient).emit('new-friend-request', recipientEventData);
                io.to(sender).emit('friend-request-sent-success', senderEventData);
            } catch (error) {
                console.error('Detailed error in friend request:', error);
                socket.emit('error', { message: 'Failed to send friend request' });
            }
        });

        socket.on('friend-request-accepted', async (data) => {
            try {
                const { sender, recipient } = data;

                // First, find and delete the request from friendRequests collection
                const requestSnapshot = await db.collection('friendRequests')
                    .where('sender', '==', sender)
                    .where('recipient', '==', recipient)
                    .where('status', '==', 'pending')
                    .get();

                if (!requestSnapshot.empty) {
                    await requestSnapshot.docs[0].ref.delete();
                }

                // Create new document in friends collection with messages subcollection
                const friendshipId = [sender, recipient].sort().join('_');
                const friendshipRef = db.collection('friends').doc(friendshipId);

                await friendshipRef.set({
                    users: [sender, recipient],
                    createdAt: new Date()
                });

                // Add initial system message to messages subcollection
                await friendshipRef.collection('messages').add({
                    content: 'You are now connected',
                    senderId: 'system',
                    timestamp: new Date(),
                    status: 'sent',
                    system: true
                });

                // Get user profiles for response
                const [senderDoc, recipientDoc] = await Promise.all([
                    db.collection('users').doc(sender).get(),
                    db.collection('users').doc(recipient).get()
                ]);

                // Emit to both users
                const acceptData = {
                    sender,
                    recipient,
                    timestamp: new Date().toISOString(),
                    senderProfile: senderDoc.data()?.profilePicture,
                    recipientProfile: recipientDoc.data()?.profilePicture
                };

                io.to(sender).to(recipient).emit('friend-request-accepted', acceptData);
            } catch (error) {
                console.error('Error handling friend accept:', error);
                socket.emit('error', { message: 'Failed to accept friend request' });
            }
        });

        socket.on('friend-request-declined', async (data) => {
            try {
                const { sender, recipient } = data;

                // Delete the friend request document
                const requestSnapshot = await db.collection('friendRequests')
                    .where('sender', '==', sender)
                    .where('recipient', '==', recipient)
                    .where('status', '==', 'pending')
                    .get();

                if (!requestSnapshot.empty) {
                    await requestSnapshot.docs[0].ref.delete();
                }

                // Notify sender their request was declined
                io.to(sender).emit('request-declined', {
                    sender,
                    recipient,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error handling friend decline:', error);
                socket.emit('error', { message: 'Failed to decline friend request' });
            }
        });

        // Group events
        socket.on('group-message', async (data) => {
            try {
                // Get sender's profile
                const senderDoc = await db.collection('users').doc(data.message.senderId).get();
                const senderData = senderDoc.data();

                // Save group message with sender info
                const messageRef = await db.collection('groupChats')
                    .doc(data.groupId)
                    .collection('messages')
                    .add({
                        content: data.message.content,
                        senderId: data.message.senderId,
                        senderName: data.message.senderId,
                        senderProfile: senderData?.profilePicture || null,
                        timestamp: new Date(),
                        status: 'sent'
                    });

                const message = {
                    id: messageRef.id,
                    ...data.message,
                    senderName: data.message.senderId,
                    senderProfile: senderData?.profilePicture || null,
                    timestamp: new Date().toISOString()
                };

                // Get group members and emit
                const groupDoc = await db.collection('groupChats').doc(data.groupId).get();
                const groupData = groupDoc.data();

                groupData.users.forEach(member => {
                    io.to(member).emit('new-group-message', {
                        groupId: data.groupId,
                        message
                    });
                });
            } catch (error) {
                console.error('Error handling group message:', error);
                socket.emit('message-error', { error: 'Failed to save message' });
            }
        });

        socket.on('group-created', (data) => {
            // Notify all members added to the group
            data.members.forEach(member => {
                io.to(member).emit('added-to-group', data);
            });
        });

        socket.on('group-updated', (data) => {
            // Notify all group members of updates
            data.members.forEach(member => {
                io.to(member).emit('group-updated', data);
            });
        });

        // User status
        socket.on('user-online', (username) => {
            socket.broadcast.emit('user-status-changed', {
                username,
                status: 'online'
            });
        });

        // Group invites
        socket.on('group-invite', async (data) => {
            try {
                const { groupId, username, invitedBy } = data;

                // Get group details
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    console.error('Group not found:', groupId);
                    socket.emit('error', { message: 'Group not found' });
                    return;
                }

                const groupData = groupDoc.data();
                console.log('Found group:', groupData.name);

                // Create chat ID for the direct message
                const chatId = [username, invitedBy].sort().join('_');

                // Add invite as a message in the friends collection's messages subcollection
                const messageRef = await db.collection('friends')
                    .doc(chatId)
                    .collection('messages')
                    .add({
                        type: 'group-invite',
                        groupId,
                        groupName: groupData.name,
                        senderId: invitedBy,
                        receiverId: username,
                        timestamp: new Date(),
                        status: 'sent',
                        content: `Invited you to join ${groupData.name}`
                    });

                const inviteData = {
                    id: messageRef.id,
                    type: 'group-invite',
                    groupId,
                    groupName: groupData.name,
                    senderId: invitedBy,
                    receiverId: username,
                    timestamp: new Date().toISOString(),
                    status: 'sent',
                    content: `Invited you to join ${groupData.name}`
                };

                // Emit as a regular message
                io.to(username).emit('new-message', {
                    chatId,
                    message: inviteData
                });

            } catch (error) {
                console.error('Error sending group invite:', error);
                socket.emit('error', { message: 'Failed to send invite' });
            }
        });

        // Handle group join
        socket.on('group-join', async (data) => {
            try {
                const { groupId, username } = data;

                // Get user's profile data
                const userDoc = await db.collection('users').doc(username).get();
                const userData = userDoc.data();

                // Get group data to notify all members
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    socket.emit('error', { message: 'Group not found' });
                    return;
                }

                const groupData = groupDoc.data();

                // Add user to group while preserving existing data
                await groupRef.update({
                    users: [...groupData.users, username],
                    updatedAt: new Date(),
                    // Preserve other fields by not overwriting them
                });

                // Add system message
                await groupRef.collection('messages').add({
                    content: `${username} joined the group`,
                    senderId: 'system',
                    timestamp: new Date(),
                    system: true
                });

                // Notify all members
                const notificationData = {
                    groupId,
                    username,
                    profilePicture: userData?.profilePicture || null
                };

                [...groupData.users, username].forEach(member => {
                    io.to(member).emit('group-invite-accepted', notificationData);
                });

            } catch (error) {
                console.error('Error joining group:', error);
                socket.emit('error', { message: 'Failed to join group' });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

module.exports = { initializeSocket, getIO }; 