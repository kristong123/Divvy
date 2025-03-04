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
                const { chatId, message } = data;

                // Ensure the message has an ID
                if (!message.id) {
                    message.id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                }

                // Store the message in the messages subcollection
                await db.collection('friends')
                    .doc(chatId)
                    .collection('messages')
                    .doc(message.id)
                    .set({
                        ...message,
                        timestamp: new Date()
                    });

                // Get the usernames from the chatId
                const [user1, user2] = chatId.split('_');

                // Emit to both users with the simplified message structure
                io.to(user1).emit('new-message', {
                    chatId,
                    message: {
                        ...message,
                        timestamp: new Date().toISOString()
                    }
                });
                io.to(user2).emit('new-message', {
                    chatId,
                    message: {
                        ...message,
                        timestamp: new Date().toISOString()
                    }
                });

            } catch (error) {
                console.error('Error sending private message:', error);
                socket.emit('message-error', { error: 'Failed to send message' });
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
                console.log(`Friend request attempt from ${sender} to ${recipient}`);

                // Check if users exist
                const senderDoc = await db.collection('users').doc(sender).get();
                const recipientDoc = await db.collection('users').doc(recipient).get();

                if (!senderDoc.exists || !recipientDoc.exists) {
                    socket.emit('error', { message: 'User not found' });
                    return;
                }

                // Check if they're already friends
                const friendshipId = [sender, recipient].sort().join('_');
                const friendshipDoc = await db.collection('friends').doc(friendshipId).get();

                if (friendshipDoc.exists) {
                    socket.emit('error', { message: 'Already friends' });
                    return;
                }

                // IMPORTANT: Delete ANY existing requests between these users, regardless of status
                const existingRequestsSnapshot = await db.collection('friendRequests')
                    .where('sender', '==', sender)
                    .where('recipient', '==', recipient)
                    .get();

                // Delete all existing requests in a batch
                if (!existingRequestsSnapshot.empty) {
                    console.log(`Deleting ${existingRequestsSnapshot.size} existing requests from ${sender} to ${recipient}`);
                    const batch = db.batch();
                    existingRequestsSnapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                }

                // Create a new friend request
                const requestRef = await db.collection('friendRequests').add({
                    sender,
                    recipient,
                    status: 'pending',
                    timestamp: new Date()
                });

                // Get user profiles for the notification
                const senderData = senderDoc.data();
                const recipientData = recipientDoc.data();

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

                console.log(`Friend request sent from ${sender} to ${recipient}`);
            } catch (error) {
                console.error('Detailed error in friend request:', error);
                socket.emit('error', { message: 'Failed to send friend request' });
            }
        });

        socket.on('friend-request-accepted', async (data) => {
            try {
                const { sender, recipient } = data;
                console.log(`Friend request accepted: ${sender} -> ${recipient}`);

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

                // Delete the friend request (instead of updating status)
                const requestSnapshot = await db.collection('friendRequests')
                    .where('sender', '==', sender)
                    .where('recipient', '==', recipient)
                    .get();

                if (!requestSnapshot.empty) {
                    await requestSnapshot.docs[0].ref.delete();
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

                // Add this line to explicitly notify the sender that their request was accepted
                io.to(sender).emit('sent-request-accepted', { sender, recipient });

                console.log(`Emitted friend-request-accepted event to ${sender} and ${recipient}`);
            } catch (error) {
                console.error('Error handling friend acceptance:', error);
                socket.emit('error', { message: 'Failed to accept friend request' });
            }
        });

        socket.on('friend-request-declined', async (data) => {
            try {
                const { sender, recipient } = data;
                console.log(`Friend request declined: ${sender} -> ${recipient}`);

                // Get the request ID from the friendRequests collection
                const requestsSnapshot = await db.collection('friendRequests')
                    .where('sender', '==', sender)
                    .where('recipient', '==', recipient)
                    .get();

                if (requestsSnapshot.empty) {
                    console.log('No matching friend request found');
                    return;
                }

                // Delete the request from the database
                const batch = db.batch();
                requestsSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();

                console.log(`Deleted ${requestsSnapshot.docs.length} friend request documents`);

                // Notify both users about the removed request
                io.to(recipient).emit('friend-request-removed', { sender, recipient });
                io.to(sender).emit('friend-request-removed', { sender, recipient });

                // Add this line to explicitly notify the sender that their request was declined
                io.to(sender).emit('sent-request-declined', { sender, recipient });

                console.log(`Emitted friend-request-removed event to ${recipient} and ${sender}`);
            } catch (error) {
                console.error('Error declining friend request:', error);
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
                const groupData = groupDoc.data();

                // Create a chat ID for the direct message conversation
                const chatId = [invitedBy, username].sort().join('_');

                // Generate a unique ID for the invite
                const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

                // Create the invite message with the simplified structure
                const inviteMessage = {
                    id: inviteId,
                    chatId: chatId,
                    senderId: invitedBy,
                    content: `${invitedBy} invited you to join ${groupData.name}`,
                    timestamp: new Date(),
                    status: 'sent',
                    type: 'group-invite',
                    groupId: groupId
                };

                // Save the invite to the messages subcollection
                await db.collection('friends')
                    .doc(chatId)
                    .collection('messages')
                    .doc(inviteId)
                    .set(inviteMessage);

                // Also save additional metadata to a dedicated collection for easier querying
                await db.collection('groupInvites').add({
                    id: inviteId,
                    groupId,
                    username,
                    invitedBy,
                    groupName: groupData.name,
                    timestamp: new Date(),
                    status: 'pending'
                });

                // Emit the invite to the recipient with additional metadata
                io.to(username).emit('group-invite', {
                    id: inviteId,
                    groupId,
                    groupName: groupData.name,
                    invitedBy,
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                console.error('Error sending group invite:', error);
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
                const { groupId, expense, keepEventOpen } = data;

                // Get the group
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    throw new Error('Group not found');
                }

                const groupData = groupDoc.data();

                // Create a new expense object with an ID
                const newExpense = {
                    id: Date.now().toString(),
                    item: expense.item,
                    amount: expense.amount,
                    paidBy: expense.paidBy,
                    addedBy: expense.paidBy,
                    splitBetween: expense.splitBetween,
                    date: expense.date || new Date().toISOString(),
                    createdAt: new Date().toISOString()
                };

                // Update the group document with the new expense
                await groupRef.update({
                    'currentEvent.expenses': admin.firestore.FieldValue.arrayUnion(newExpense)
                });

                // Notify all group members - broadcast to the group room
                io.to(groupId).emit('expense-added', {
                    groupId,
                    expenses: [newExpense],
                    keepEventOpen
                });
            } catch (error) {
                console.error('Error adding expense:', error);
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

        socket.on('remove-expense-item', async (data) => {
            try {
                const { groupId, expenseId, itemIndex } = data;
                console.log('Removing expense item:', { groupId, expenseId, itemIndex });

                // Get the group document
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    console.log('Group not found');
                    return;
                }

                const groupData = groupDoc.data();

                if (!groupData.currentEvent || !groupData.currentEvent.expenses) {
                    console.log('No current event or expenses');
                    return;
                }

                // Find the expense
                const expenses = [...groupData.currentEvent.expenses]; // Create a copy
                const expenseIndex = expenses.findIndex(exp => exp.id === expenseId);

                if (expenseIndex === -1) {
                    console.log('Expense not found:', expenseId);
                    return;
                }

                console.log('Found expense at index:', expenseIndex);

                // Remove the expense from the array
                expenses.splice(expenseIndex, 1);

                // Update the group document with the modified expenses array
                await groupRef.update({
                    'currentEvent.expenses': expenses
                });

                console.log('Updated expenses:', expenses);

                // Notify all group members with the complete updated expenses array
                io.to(groupId).emit('expenses-updated', {
                    groupId,
                    expenses
                });
            } catch (error) {
                console.error('Error removing expense item:', error);
            }
        });

        // Add a new socket event handler for individual expenses
        socket.on('add-expense', async (data) => {
            try {
                const { groupId, expense, keepEventOpen } = data;
                console.log(`Adding expense to group ${groupId}:`, expense);

                // Get the group document
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    return;
                }

                const groupData = groupDoc.data();

                if (!groupData.currentEvent) {
                    return;
                }

                // Create a single expense with a unique ID
                const newExpense = {
                    id: admin.firestore().collection('temp').doc().id,
                    item: expense.item,
                    amount: expense.amount,
                    paidBy: expense.paidBy,
                    addedBy: expense.addedBy,
                    splitBetween: expense.splitBetween,
                    date: expense.date || new Date().toISOString(),
                    createdAt: new Date().toISOString()
                };

                // Update the group document with the new expense
                await groupRef.update({
                    'currentEvent.expenses': admin.firestore.FieldValue.arrayUnion(newExpense)
                });

                // Explicitly broadcast to the group room
                console.log(`Broadcasting expense-added to group room: ${groupId}`);
                io.to(groupId).emit('expense-added', {
                    groupId,
                    expenses: [newExpense],
                    keepEventOpen
                });
            } catch (error) {
                console.error('Error adding expense:', error);
            }
        });

        // Add a new socket event handler to update existing expenses
        socket.on('update-existing-expenses', async (data) => {
            try {
                const { groupId } = data;

                // Get the group document
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) return;

                const groupData = groupDoc.data();

                if (!groupData.currentEvent || !groupData.currentEvent.expenses) return;

                // Update each expense to include splitBetween if missing
                const updatedExpenses = groupData.currentEvent.expenses.map(expense => {
                    if (!expense.splitBetween) {
                        // Add all users except the payer to splitBetween
                        const splitBetween = groupData.users
                            .filter(user => user.username !== expense.paidBy)
                            .map(user => user.username);

                        return {
                            ...expense,
                            splitBetween: splitBetween.length > 0 ? splitBetween : ['a'] // Fallback to 'a' if no other users
                        };
                    }
                    return expense;
                });

                // Update the group document
                await groupRef.update({
                    'currentEvent.expenses': updatedExpenses
                });

                // Notify all group members
                io.to(groupId).emit('expenses-updated', {
                    groupId,
                    expenses: updatedExpenses
                });
            } catch (error) {
                console.error('Error updating existing expenses:', error);
            }
        });

        socket.on('join-group', (data) => {
            const { groupId, username } = data;
            if (groupId && username) {
                console.log(`${username} joined group room: ${groupId}`);
                socket.join(groupId);
            }
        });

        socket.on('leave-group', (data) => {
            const { groupId, username } = data;
            if (groupId && username) {
                console.log(`${username} left group room: ${groupId}`);
                socket.leave(groupId);
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });

        socket.on('profile-picture-updated', async (data) => {
            try {
                const { username, imageUrl } = data;

                // Broadcast to all connected clients
                io.emit('profile-picture-updated', { username, imageUrl });

                console.log(`Profile picture updated for ${username}`);
            } catch (error) {
                console.error('Error handling profile picture update:', error);
            }
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