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
            console.log('Received private message:', data);

            try {
                const messageRef = await db.collection('chats')
                    .doc(data.chatId)
                    .collection('messages')
                    .add({
                        senderId: data.senderId,
                        content: data.content,
                        timestamp: new Date(),
                        status: 'sent'
                    });

                console.log('Message saved with ID:', messageRef.id);

                // Update chat document
                await db.collection('chats').doc(data.chatId).set({
                    users: [data.senderId, data.receiverId],
                    lastMessage: data.content,
                    lastMessageTime: new Date(),
                    updatedAt: new Date()
                }, { merge: true });

                const messageData = {
                    ...data,
                    id: messageRef.id
                };

                io.to(data.receiverId).to(data.senderId).emit('new-message', {
                    chatId: data.chatId,
                    message: messageData
                });

                console.log('Message emitted to users');
            } catch (error) {
                console.error('Error saving message:', error);
                socket.emit('message-error', { error: 'Failed to save message' });
            }
        });

        socket.on('leave', (username) => {
            socket.leave(username);
            console.log(`${username} left their room`);
        });

        // Friend requests
        socket.on('friend-request', (data) => {
            io.to(data.receiverId).emit('new-friend-request', data);
        });

        socket.on('friend-request-accepted', (data) => {
            io.to(data.senderId).emit('friend-request-accepted', data);
        });

        socket.on('friend-request-declined', (data) => {
            io.to(data.senderId).emit('friend-request-declined', data);
        });

        // Group events
        socket.on('group-message', async (data) => {
            try {
                // Get group data to find members
                const groupRef = await db.collection('groupChats').doc(data.groupId).get();
                const groupData = groupRef.data();

                if (!groupData) {
                    throw new Error('Group not found');
                }

                // Emit to all group members
                groupData.users.forEach(member => {
                    io.to(member).emit('new-group-message', {
                        groupId: data.groupId,
                        message: data.message
                    });
                });
            } catch (error) {
                console.error('Error broadcasting group message:', error);
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