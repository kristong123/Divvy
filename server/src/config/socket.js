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

        socket.on('direct-message', async (data) => {
            try {
                const { chatId, message } = data;

                // Ensure the message has an ID
                if (!message.id) {
                    message.id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                }

                // Create a unique key for this message to prevent duplicates
                const messageKey = `${chatId}_${message.content}_${message.timestamp || new Date().toISOString()}`;
                console.log(`Processing direct message: ${messageKey}`);

                // Extract the usernames from the message
                const sender = message.senderId;
                const recipient = chatId.split('_').find(user => user !== sender);

                if (!sender || !recipient) {
                    console.error('Invalid message format: missing sender or recipient');
                    socket.emit('message-error', { error: 'Invalid message format' });
                    return;
                }

                // Create the correct friendship ID by sorting the usernames
                const friendshipId = [sender, recipient].sort().join('_');

                // Check if the friendship document exists
                const friendshipRef = db.collection('friends').doc(friendshipId);
                const friendshipDoc = await friendshipRef.get();

                // Create the friendship document if it doesn't exist
                if (!friendshipDoc.exists) {
                    console.log(`Creating new friendship document: ${friendshipId}`);
                    await friendshipRef.set({
                        users: [sender, recipient],
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'accepted'
                    });
                }

                // Store the message in the messages subcollection
                const messageToStore = {
                    ...message,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'sent',
                    readBy: [message.senderId] // Initialize with sender
                };

                await friendshipRef
                    .collection('messages')
                    .doc(message.id)
                    .set(messageToStore);

                // Prepare the message with a consistent timestamp
                const messageToSend = {
                    ...message,
                    timestamp: new Date().toISOString()
                };

                // Emit to both users with the simplified message structure
                io.to(sender).emit('new-message', {
                    chatId: friendshipId,
                    message: messageToSend
                });
                io.to(recipient).emit('new-message', {
                    chatId: friendshipId,
                    message: messageToSend
                });

            } catch (error) {
                console.error('Error sending direct message:', error);
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

                // Ensure the message has an ID
                if (!message.id) {
                    message.id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                }

                // Create a unique key for this message to prevent duplicates
                const messageKey = `${groupId}_${message.content}_${message.timestamp || new Date().toISOString()}`;
                console.log(`Processing group message: ${messageKey}`);

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

                // Save message to database with read status fields
                const messageToStore = {
                    content: message.content,
                    senderId: message.senderId,
                    senderName: message.senderId,
                    senderProfile: senderData?.profilePicture || null,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    system: message.system || false,
                    type: message.type || (message.system ? 'system' : 'user'),
                    status: 'sent',
                    readBy: [message.senderId], // Initialize with sender
                    id: message.id
                };

                // Add message to database
                const messageRef = await groupRef.collection('messages').doc(message.id).set(messageToStore);

                // Create the message object to broadcast with read status
                const messageToSend = {
                    ...messageToStore,
                    id: message.id,
                    timestamp: new Date().toISOString()
                };

                // Broadcast to all group members
                groupData.users.forEach(username => {
                    const memberUsername = typeof username === 'string' ? username : username.username;
                    console.log(`📨 Sending group message to ${memberUsername}`);
                    io.to(memberUsername).emit('new-group-message', {
                        groupId: `group_${groupId}`, // Make sure to include group_ prefix
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
            console.log('Socket: group-updated event received', data);

            // Validate the data
            if (!data.groupId || !data.members || !Array.isArray(data.members)) {
                console.error('Invalid data for group-updated event:', data);
                return;
            }

            // Notify all group members of updates
            data.members.forEach(member => {
                console.log(`Notifying member ${member} about group update for ${data.groupId}`);
                io.to(member).emit('group-updated', {
                    groupId: data.groupId,
                    name: data.name,
                    imageUrl: data.imageUrl,
                    updatedBy: data.updatedBy
                });
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

                // Create the correct friendship ID by sorting the usernames
                const friendshipId = [invitedBy, username].sort().join('_');

                // Generate a unique ID for the invite
                const inviteId = `invite_${groupId}_${Date.now()}`;

                // Create the invite message with the simplified structure
                const inviteMessage = {
                    id: inviteId,
                    chatId: friendshipId,
                    senderId: invitedBy,
                    content: `${invitedBy} invited you to join ${groupData.name}`,
                    timestamp: new Date(),
                    status: 'sent',
                    type: 'group-invite',
                    groupId: groupId,
                    groupName: groupData.name
                };

                // Check if the friendship document exists
                const friendshipRef = db.collection('friends').doc(friendshipId);
                const friendshipDoc = await friendshipRef.get();

                // Create the friendship document if it doesn't exist
                if (!friendshipDoc.exists) {
                    console.log(`Creating new friendship document for group invite: ${friendshipId}`);
                    await friendshipRef.set({
                        users: [invitedBy, username],
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        status: 'accepted'
                    });
                }

                // Save the invite to the messages subcollection
                await friendshipRef
                    .collection('messages')
                    .doc(inviteId)
                    .set(inviteMessage);

                // Emit the invite to the recipient with additional metadata
                io.to(username).emit('group-invite', {
                    id: inviteId,
                    groupId,
                    groupName: groupData.name,
                    senderId: invitedBy
                });

                // Also emit a new message event to both users
                io.to(username).emit('new-message', {
                    chatId: friendshipId,
                    message: {
                        ...inviteMessage,
                        timestamp: inviteMessage.timestamp.toISOString()
                    }
                });

                io.to(invitedBy).emit('new-message', {
                    chatId: friendshipId,
                    message: {
                        ...inviteMessage,
                        timestamp: inviteMessage.timestamp.toISOString()
                    }
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

                // Check if user is already in the group
                if (groupData.users.includes(username)) {
                    console.log(`User ${username} is already in group ${groupId}, skipping add`);

                    // Still notify the user that they've joined (for UI updates)
                    io.to(username).emit('group-invite-accepted', {
                        groupId,
                        username,
                        profilePicture: userData?.profilePicture || null
                    });

                    return;
                }

                // Add user to group while preserving existing data
                await groupRef.update({
                    users: [...groupData.users, username],
                    updatedAt: new Date(),
                    // Preserve other fields by not overwriting them
                });

                // Add system message
                const systemMessage = {
                    content: `${username} joined the group`,
                    senderId: 'system',
                    timestamp: new Date(),
                    system: true,
                    type: 'system'
                };

                // Add to database
                const systemMessageRef = await groupRef.collection('messages').add(systemMessage);

                // Get the message ID
                const systemMessageId = systemMessageRef.id;

                // Notify all members about the system message
                [...groupData.users, username].forEach(member => {
                    io.to(typeof member === 'string' ? member : member.username).emit('new-group-message', {
                        groupId,
                        message: {
                            ...systemMessage,
                            id: systemMessageId,
                            chatId: groupId,
                            timestamp: systemMessage.timestamp.toISOString(),
                            status: 'sent'
                        }
                    });
                });

                // Notify all members about the user joining
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
                    itemName: expense.itemName || "Expense", // Use only itemName
                    amount: expense.amount,
                    paidBy: expense.paidBy,
                    addedBy: expense.paidBy,
                    splitBetween: expense.splitBetween,
                    date: expense.date || new Date().toISOString(),
                    createdAt: new Date().toISOString()
                };

                console.log("Creating new expense with data:", {
                    id: newExpense.id,
                    itemName: newExpense.itemName,
                    amount: newExpense.amount,
                    addedBy: newExpense.addedBy
                });

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

                console.log(`Updating expense with ID: ${expense.id}`);

                // Get the group
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) {
                    throw new Error('Group not found');
                }

                const groupData = groupDoc.data();

                // Find and update the expense in the current event
                if (groupData.currentEvent) {
                    // Find the existing expense
                    const existingExpense = groupData.currentEvent.expenses.find(exp => exp.id === expense.id);

                    if (!existingExpense) {
                        console.log(`Expense with ID ${expense.id} not found`);
                        return;
                    }

                    // We're now doing change detection on the client side
                    // so we can assume any update that reaches here has actual changes
                    console.log(`Updating expense ${expense.id}...`);

                    const updatedExpenses = groupData.currentEvent.expenses.map(exp => {
                        if (exp.id === expense.id) {
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
                console.error('Expense data:', data?.expense);
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
                    console.log('Expense not found with ID:', expenseId);
                    console.log('This might be a generated ID. Checking all expenses...');

                    // If we can't find the expense by ID, log all expense IDs for debugging
                    console.log('All expense IDs:', expenses.map(exp => exp.id));
                    return;
                }

                console.log('Found expense at index:', expenseIndex, 'with ID:', expenseId);
                console.log('Expense details:', expenses[expenseIndex]);

                // Remove the expense from the array
                expenses.splice(expenseIndex, 1);

                // Update the group document with the modified expenses array
                await groupRef.update({
                    'currentEvent.expenses': expenses
                });

                console.log('Updated expenses array length:', expenses.length);

                // Get all users in the group to notify them individually
                const users = groupData.users || [];

                // Notify all group members with the complete updated expenses array
                // First, emit to the group room for users currently viewing the group
                io.to(groupId).emit('expenses-updated', {
                    groupId,
                    expenses
                });

                // Then, emit to each user individually to ensure they all get the update
                // even if they're not currently in the group room
                users.forEach(user => {
                    if (user && user.username) {
                        console.log(`Notifying user ${user.username} about expense update in group ${groupId}`);
                        io.to(user.username).emit('expenses-updated', {
                            groupId,
                            expenses
                        });
                    }
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

                // Log if this is a split expense
                if (expense._debtor) {
                    console.log(`This is an expense for user: ${expense._debtor}, amount: $${expense.amount.toFixed(2)}, paid by: ${expense.addedBy}`);
                }

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
                    itemName: expense.itemName || "Expense", // Use only itemName
                    amount: expense.amount,
                    addedBy: expense.addedBy, // addedBy tracks who paid
                    date: expense.date || new Date().toISOString(),
                    // Store metadata as custom fields if needed for processing
                    _debtor: expense._debtor
                };

                console.log("Creating new expense with data:", {
                    id: newExpense.id,
                    itemName: newExpense.itemName,
                    amount: newExpense.amount,
                    addedBy: newExpense.addedBy
                });

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
                const { groupId, useDebtorFormat } = data;

                // Get the group document
                const groupRef = db.collection('groupChats').doc(groupId);
                const groupDoc = await groupRef.get();

                if (!groupDoc.exists) return;

                const groupData = groupDoc.data();

                if (!groupData.currentEvent || !groupData.currentEvent.expenses) return;

                // Update each expense to include metadata if missing
                const updatedExpenses = groupData.currentEvent.expenses.map(expense => {
                    // If using the new debtor format and missing metadata
                    if (useDebtorFormat && !expense._debtor) {
                        // For backward compatibility, use paidBy or addedBy
                        const payer = expense.paidBy || expense.addedBy;

                        // Find a debtor (someone who isn't the payer)
                        const debtor = groupData.users
                            .find(user => user.username !== payer)?.username;

                        return {
                            ...expense,
                            // Convert item to name if needed
                            name: expense.name || expense.itemName,
                            // Make sure addedBy is set to the payer
                            addedBy: payer,
                            // Add metadata
                            _debtor: debtor || groupData.users[0]?.username // Fallback to first user
                        };
                    }
                    // For backward compatibility with old format
                    else if (!expense.splitBetween) {
                        // Add all users except the payer to splitBetween
                        const payer = expense.paidBy || expense.addedBy;
                        const splitBetween = groupData.users
                            .filter(user => user.username !== payer)
                            .map(user => user.username);

                        return {
                            ...expense,
                            splitBetween: splitBetween.length > 0 ? splitBetween : [groupData.users[0]?.username]
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

                // Clean the image URL to prevent multiple timestamps
                const cleanImageUrl = imageUrl.includes("?")
                    ? imageUrl.split("?")[0]
                    : imageUrl;

                // Broadcast to all connected clients except the sender
                socket.broadcast.emit('profile-picture-updated', {
                    username,
                    imageUrl: cleanImageUrl
                });

                console.log(`Profile picture updated for ${username}`);
            } catch (error) {
                console.error('Error handling profile picture update:', error);
            }
        });

        // Add a handler for the broadcast-group-update event
        socket.on('broadcast-group-update', (data) => {
            console.log(`Broadcasting group update for ${data.groupId} to all users:`, data);

            // Validate the data
            if (!data.groupId || !data.members || !Array.isArray(data.members)) {
                console.error('Invalid data for broadcast-group-update event:', data);
                return;
            }

            // First, broadcast to all connected clients to ensure everyone gets the update
            console.log(`Broadcasting to all connected clients`);
            io.emit('broadcast-group-update', {
                groupId: data.groupId,
                name: data.name,
                imageUrl: data.imageUrl,
                updatedBy: data.updatedBy,
                members: data.members
            });

            // Then, also send direct messages to each member for redundancy
            data.members.forEach(member => {
                console.log(`Sending direct update to member ${member} about group ${data.groupId}`);
                io.to(member).emit('group-updated', {
                    groupId: data.groupId,
                    name: data.name,
                    imageUrl: data.imageUrl,
                    updatedBy: data.updatedBy
                });
            });
        });

        // Add this to your socket connection handler
        socket.on('mark-messages-read', async (data) => {
            try {
                const { chatId, userId } = data;
                const isGroupChat = chatId.startsWith('group_');
                const actualChatId = isGroupChat ? chatId.replace('group_', '') : chatId;

                console.log(`📱 Processing read receipt:`, { chatId, userId, isGroupChat, actualChatId });

                if (isGroupChat) {
                    // Get the group first to verify it exists
                    const groupRef = db.collection('groupChats').doc(actualChatId);
                    const groupDoc = await groupRef.get();

                    if (!groupDoc.exists) {
                        console.error(`❌ Group ${actualChatId} not found`);
                        return;
                    }

                    const messagesRef = groupRef.collection('messages');
                    const messagesSnapshot = await messagesRef
                        .where('status', '==', 'sent')
                        .get();

                    console.log(`Found ${messagesSnapshot.size} unread messages in group ${actualChatId}`);

                    const batch = db.batch();
                    let updatedCount = 0;

                    messagesSnapshot.forEach(doc => {
                        const messageData = doc.data();
                        console.log(`Checking message ${doc.id}:`, messageData);

                        if (messageData.senderId !== userId) {
                            const readBy = messageData.readBy || [];

                            if (!readBy.includes(userId)) {
                                const updatedReadBy = [...readBy, userId];
                                console.log(`Updating message ${doc.id} readBy:`, updatedReadBy);

                                batch.update(doc.ref, {
                                    readBy: updatedReadBy,
                                    status: 'read'
                                });

                                updatedCount++;

                                // Emit to all group members to ensure UI updates
                                const groupData = groupDoc.data();
                                groupData.users.forEach(member => {
                                    const memberUsername = typeof member === 'string' ? member : member.username;
                                    console.log(`📬 Emitting read receipt to ${memberUsername}`);
                                    io.to(memberUsername).emit('message-read', {
                                        chatId: `group_${actualChatId}`,
                                        messageId: doc.id,
                                        readBy: updatedReadBy
                                    });
                                });
                            }
                        }
                    });

                    if (updatedCount > 0) {
                        await batch.commit();
                        console.log(`✅ Updated ${updatedCount} messages as read in group ${actualChatId}`);
                    } else {
                        console.log('No messages needed updating');
                    }
                }
                // Handle direct messages (existing code)
                else {
                    const messagesSnapshot = await db.collection('friends')
                        .doc(actualChatId)
                        .collection('messages')
                        .where('senderId', '!=', userId)
                        .where('status', '==', 'sent')
                        .get();

                    const batch = db.batch();

                    messagesSnapshot.forEach(doc => {
                        const messageData = doc.data();
                        const readBy = messageData.readBy || [];

                        if (!readBy.includes(userId)) {
                            const updatedReadBy = [...readBy, userId];
                            batch.update(doc.ref, {
                                readBy: updatedReadBy,
                                status: 'read'
                            });

                            io.to(messageData.senderId).emit('message-read', {
                                chatId: actualChatId,
                                messageId: doc.id,
                                readBy: updatedReadBy
                            });
                        }
                    });

                    await batch.commit();
                }
            } catch (error) {
                console.error('❌ Error in mark-messages-read:', error);
                console.error('Error details:', error.message);
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