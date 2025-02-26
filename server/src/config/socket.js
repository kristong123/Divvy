const { Server } = require("socket.io");
const corsOptions = require("./corsOptions");
const { db } = require("./firebase");
const admin = require('firebase-admin');

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
                        receiverId: data.message.receiverId,
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
                io.to(data.message.receiverId).emit('new-message', {
                    chatId: data.chatId,
                    message
                });

                // Also emit to sender if they're not the recipient
                if (data.message.senderId !== data.message.receiverId) {
                    io.to(data.message.senderId).emit('new-message', {
                        chatId: data.chatId,
                        message
                    });
                }
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

                // Prevent sending friend request to yourself
                if (sender === recipient) {
                    socket.emit('error', { message: 'Cannot send friend request to yourself' });
                    return;
                }

                // Check if they're already friends
                const friendshipId = [sender, recipient].sort().join('_');
                const existingFriendship = await db.collection('friends').doc(friendshipId).get();
                if (existingFriendship.exists) {
                    socket.emit('error', { message: 'You are already friends with this user' });
                    return;
                }

                // Check for any existing requests in either direction
                const existingRequests = await db.collection('friendRequests')
                    .where('status', '==', 'pending')
                    .where('sender', 'in', [sender, recipient])
                    .get();

                const hasExistingRequest = existingRequests.docs.some(doc => {
                    const request = doc.data();
                    return (request.sender === sender && request.recipient === recipient) ||
                        (request.sender === recipient && request.recipient === sender);
                });

                if (hasExistingRequest) {
                    socket.emit('error', { message: 'A friend request already exists between you and this user' });
                    return;
                }

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

                // Get user profiles
                const senderDoc = await db.collection('users').doc(sender).get();
                const recipientDoc = await db.collection('users').doc(recipient).get();

                if (!senderDoc.exists || !recipientDoc.exists) {
                    throw new Error('User not found');
                }

                const senderData = senderDoc.data();
                const recipientData = recipientDoc.data();

                // Create friendship document
                const friendshipId = [sender, recipient].sort().join('_');
                await db.collection('friends').doc(friendshipId).set({
                    users: [sender, recipient],
                    createdAt: new Date()
                });

                // Update the friend request status
                const requestSnapshot = await db.collection('friendRequests')
                    .where('sender', '==', sender)
                    .where('recipient', '==', recipient)
                    .where('status', '==', 'pending')
                    .get();

                if (!requestSnapshot.empty) {
                    await requestSnapshot.docs[0].ref.update({
                        status: 'accepted',
                        updatedAt: new Date()
                    });
                }

                // Notify both users about the accepted request
                const notificationData = {
                    sender,
                    recipient,
                    senderProfile: senderData.profilePicture || null,
                    recipientProfile: recipientData.profilePicture || null,
                    timestamp: new Date().toISOString()
                };

                // Notify the sender
                io.to(sender).emit('friend-request-accepted', notificationData);

                // Notify the recipient
                io.to(recipient).emit('friend-request-accepted', notificationData);
            } catch (error) {
                console.error('Error handling friend acceptance:', error);
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
                const { groupId, message } = data;

                // Get group data to find all members
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    throw new Error('Group not found');
                }

                const groupData = groupDoc.data();

                // Get sender's profile
                const senderDoc = await db.collection('users').doc(message.senderId).get();
                const senderData = senderDoc.data();

                // Save message to database
                const messageRef = await groupRef.collection('messages').add({
                    content: message.content,
                    senderId: message.senderId,
                    senderName: message.senderId,
                    senderProfile: senderData?.profilePicture || null,
                    timestamp: new Date(),
                    system: false
                });

                // Update group's last message
                await groupRef.update({
                    lastMessage: message.content,
                    lastMessageTime: new Date(),
                    updatedAt: new Date()
                });

                // Create the message object to broadcast
                const messageToSend = {
                    id: messageRef.id,
                    ...message,
                    senderName: message.senderId,
                    senderProfile: senderData?.profilePicture || null,
                    timestamp: new Date().toISOString()
                };

                // Broadcast to all group members
                groupData.users.forEach(username => {
                    io.to(username).emit('new-group-message', {
                        groupId,
                        message: messageToSend
                    });
                });
            } catch (error) {
                console.error('Error handling group message:', error);
                socket.emit('message-error', { error: 'Failed to save group message' });
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

        socket.on('event-update', async (data) => {
            try {
                const { groupId, event } = data;

                // Save event to database
                const groupRef = db.collection('groupChats').doc(groupId);

                if (event === null) {
                    // If event is null, remove the currentEvent field entirely
                    await groupRef.update({
                        currentEvent: null
                    });
                } else {
                    // Otherwise update with the new event
                    await groupRef.update({
                        currentEvent: {
                            ...event,
                            updatedAt: new Date()
                        }
                    });
                }

                // Get group data for broadcasting
                const groupDoc = await groupRef.get();
                const groupData = groupDoc.data();

                // Broadcast to all group members
                groupData.users.forEach(member => {
                    io.to(member).emit('event-updated', {
                        groupId,
                        event: event === null ? null : {
                            ...event,
                            updatedAt: new Date().toISOString()
                        }
                    });
                });
            } catch (error) {
                console.error('Error updating event:', error);
                socket.emit('error', { message: 'Failed to update event' });
            }
        });

        socket.on('expense-added', async (data) => {
            try {
                const { groupId, expense, eventTitle } = data;

                // Get the group
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    throw new Error('Group not found');
                }

                const groupData = groupDoc.data();

                // Get sender's profile data
                const senderDoc = await db.collection('users').doc(expense.paidBy).get();
                const senderData = senderDoc.data();

                // Add the expense to the current event
                if (groupData.currentEvent) {
                    const newExpense = {
                        ...expense,
                        id: Date.now().toString(),
                        createdAt: new Date().toISOString()
                    };

                    // Important: Make a copy of the current event to avoid reference issues
                    const updatedEvent = {
                        ...groupData.currentEvent,
                        expenses: [...(groupData.currentEvent.expenses || []), newExpense]
                    };

                    // Update with the entire event object to maintain all properties
                    await groupRef.update({
                        currentEvent: updatedEvent
                    });

                    // Notify all users who are part of the split
                    for (const username of expense.splitBetween) {
                        // Don't notify the person who added the expense
                        if (username !== expense.paidBy) {
                            // Create notification
                            const notification = {
                                id: `expense_${newExpense.id}_${username}`,
                                type: 'expense_added',
                                title: `New expense in ${groupData.name}`,
                                message: `${expense.paidBy} added a charge for ${expense.item} ($${expense.amount.toFixed(2)}) to you`,
                                data: {
                                    groupId,
                                    eventId: groupData.currentEvent.id,
                                    expenseId: newExpense.id,
                                    sender: expense.paidBy,
                                    senderProfile: senderData?.profilePicture || null,
                                    item: expense.item,
                                    amount: expense.amount,
                                    eventTitle: eventTitle || groupData.currentEvent.title
                                },
                                timestamp: new Date().toISOString(),
                                read: false
                            };

                            // Store notification in Firestore
                            try {
                                await db.collection('users').doc(username)
                                    .collection('notifications')
                                    .doc(notification.id)
                                    .set(notification);
                            } catch (err) {
                                console.error('Error storing notification:', err);
                            }

                            // Send notification to the user
                            io.to(username).emit('notification', notification);
                        }
                    }

                    // Notify all group members about the expense update
                    groupData.users.forEach(username => {
                        io.to(username).emit('expense-added', {
                            groupId,
                            expense: newExpense,
                            keepEventOpen: true // Add this flag to indicate event view should stay open
                        });
                    });
                }
            } catch (error) {
                console.error('Error adding expense:', error);
                socket.emit('expense-error', { error: 'Failed to add expense' });
            }
        });

        socket.on('update_venmo_username', async (data) => {
            try {
                const { username, venmoUsername } = data;

                // Update in database
                await db.collection('users').doc(username).update({
                    venmoUsername,
                    updatedAt: new Date()
                });

                // Broadcast to ALL connected clients (not just the sender's room)
                socket.broadcast.emit('venmo_username_updated', {
                    username,
                    venmoUsername
                });
            } catch (error) {
                console.error('Error handling venmo username update:', error);
                socket.emit('error', { message: 'Failed to update Venmo username' });
            }
        });

        // When a group is deleted
        socket.on('group-deleted', (groupId) => {
            // Notify all connected clients about the deleted group
            io.emit('group-deleted', { groupId });
        });

        // When a user is added to a group
        socket.on('user-added-to-group', async ({ groupId, username }) => {
            try {
                // Get the group data
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    throw new Error('Group not found');
                }

                const groupData = groupDoc.data();

                // Add the user to the group if not already a member
                if (!groupData.users.some(u => u.username === username)) {
                    // Create a proper user object
                    const userDoc = await db.collection('users').doc(username).get();
                    const userData = userDoc.data();

                    const newUser = {
                        username: username,
                        profilePicture: userData?.profilePicture || null,
                        isAdmin: false,
                        venmoUsername: userData?.venmoUsername || null
                    };

                    // Update the users array with the new user object
                    await groupRef.update({
                        users: admin.firestore.FieldValue.arrayUnion(newUser)
                    });

                    // Update the groupData for the emit below
                    groupData.users.push(newUser);
                }

                // Send the FULL group data including the current event
                io.to(username).emit('user-added-to-group', {
                    groupId,
                    // Include the FULL group data
                    groupData: {
                        ...groupData,
                        id: groupId,
                        // Ensure currentEvent is included if it exists
                        currentEvent: groupData.currentEvent || null
                    }
                });

                // Also emit a system message to the group chat
                const systemMessage = {
                    content: `${username} has joined the group`,
                    senderId: 'system',
                    senderName: 'System',
                    senderProfile: null,
                    timestamp: new Date(),
                    system: true
                };

                // Save the system message
                const messageRef = await groupRef.collection('messages').add(systemMessage);

                // Broadcast the system message to all group members
                groupData.users.forEach(member => {
                    io.to(typeof member === 'string' ? member : member.username).emit('new-group-message', {
                        groupId,
                        message: {
                            id: messageRef.id,
                            ...systemMessage,
                            timestamp: systemMessage.timestamp.toISOString()
                        }
                    });
                });
            } catch (error) {
                console.error('Error adding user to group:', error);
                socket.emit('error', { message: 'Failed to add user to group' });
            }
        });

        // When a user is removed from a group
        socket.on('user-removed-from-group', ({ groupId, username }) => {
            // Notify the specific user that they've been removed
            io.to(username).emit('user-removed-from-group', { groupId });
        });

        socket.on('update-expense', async (data) => {
            try {
                const { groupId, expense } = data;

                // Get the group
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    throw new Error('Group not found');
                }

                const groupData = groupDoc.data();

                // Find and update the expense in the current event
                if (groupData.currentEvent) {
                    const updatedExpenses = groupData.currentEvent.expenses.map(exp => {
                        if (exp.id === expense.id ||
                            (exp.item === expense.originalItem && exp.paidBy === expense.paidBy)) {
                            return expense;
                        }
                        return exp;
                    });

                    // Update the event with new expenses
                    await groupRef.update({
                        'currentEvent.expenses': updatedExpenses
                    });

                    // Notify all group members
                    groupData.users.forEach(username => {
                        io.to(username).emit('expense-updated', {
                            groupId,
                            expense
                        });
                    });
                }
            } catch (error) {
                console.error('Error updating expense:', error);
                socket.emit('expense-error', { error: 'Failed to update expense' });
            }
        });

        socket.on('remove-expense', async (data) => {
            try {
                const { groupId, expense } = data;

                // Get the group
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    throw new Error('Group not found');
                }

                const groupData = groupDoc.data();

                // Remove the expense from the current event
                if (groupData.currentEvent) {
                    const updatedExpenses = groupData.currentEvent.expenses.filter(exp =>
                        exp.id !== expense.id &&
                        !(exp.item === expense.item && exp.paidBy === expense.paidBy)
                    );

                    // Update the event with new expenses
                    await groupRef.update({
                        'currentEvent.expenses': updatedExpenses
                    });

                    // Notify all group members
                    groupData.users.forEach(username => {
                        io.to(username).emit('expense-removed', {
                            groupId,
                            expenseId: expense.id
                        });
                    });
                }
            } catch (error) {
                console.error('Error removing expense:', error);
                socket.emit('expense-error', { error: 'Failed to remove expense' });
            }
        });

        socket.on('mark-notification-read', async (data) => {
            try {
                const { username, notificationId } = data;

                // Update only this specific notification in Firestore
                await db.collection('users')
                    .doc(username)
                    .collection('notifications')
                    .doc(notificationId)
                    .update({ read: true });

                // Emit back ONLY to the requesting client, not to all clients
                socket.emit('notification-marked-read', { id: notificationId });

            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
        });

        socket.on('clear-all-notifications', async (data) => {
            try {
                const { username } = data;

                // Get all notifications
                const notificationsRef = db.collection('users')
                    .doc(username)
                    .collection('notifications');

                const snapshot = await notificationsRef.get();

                // Delete them in a batch
                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();

                // Emit back to the client
                socket.emit('all-notifications-cleared');
            } catch (error) {
                console.error('Error clearing all notifications:', error);
            }
        });

        socket.on('fetch-notifications', async (username) => {
            try {
                // Get notifications from Firestore
                const notificationsSnapshot = await db.collection('users')
                    .doc(username)
                    .collection('notifications')
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .get();

                const notifications = [];
                notificationsSnapshot.forEach(doc => {
                    notifications.push(doc.data());
                });

                // Send notifications back to the client
                socket.emit('notifications-loaded', notifications);
            } catch (error) {
                console.error('Error fetching notifications:', error);
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