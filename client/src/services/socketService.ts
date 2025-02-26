import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { store } from '../store/store';
import { setFriends, setPendingRequests, setSentRequests, clearRequests } from '../store/slice/friendsSlice';
import { addMessage } from '../store/slice/chatSlice';
import { toast } from 'react-hot-toast';
import { MessageData, SocketMessageEvent, SocketErrorEvent, FriendRequestEvent } from '../types/messages';
import { groupActions } from '../store/slice/groupSlice';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { Event } from '../store/slice/groupSlice';
import { setVenmoUsername } from '../store/slice/userSlice';
import { addNotification, notificationMarkedRead, allNotificationsMarkedRead, setNotifications, allNotificationsCleared } from '../store/slice/notificationsSlice';
import { createAsyncThunk } from '@reduxjs/toolkit';

const socket = io(SOCKET_URL);

interface GroupInviteAcceptedData {
  groupId: string;
  username: string;
  group: {
    id: string;
    name: string;
    admin: string;
    users: Array<{
      username: string;
      profilePicture: string | null;
      isAdmin: boolean;
      venmoUsername?: string;
    }>;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  };
}

interface Expense {
    id: string;
    item: string;
    amount: number;
    paidBy: string;
    splitBetween: string[];
    createdAt: string;
    status: 'pending' | 'paid';
}

interface SocketData {
  type: string;
  payload: unknown;
  // add other socket data properties
}

interface GroupData {
  id: string;
  name: string;
  users: Array<{
    username: string;
    profilePicture: string | null;
    isAdmin: boolean;
    venmoUsername?: string;
  }>;
  currentEvent?: Event | null;
  [key: string]: any; // For any other properties
}

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

// Move these outside the initializeSocket function
export const clearAllNotifications = createAsyncThunk(
  'notifications/clearAllNotifications',
  async (username: string) => {
    socket.emit('clear-all-notifications', { username });
    return;
  }
);

export const initializeSocket = (username: string) => {
    socket.emit('join', username);

    // Track message IDs we've already processed
    const processedMessageIds = new Set<string>();

    // Friend request events with real-time updates
    socket.on('new-friend-request', (data: FriendRequestEvent) => {
        if (!data.id) return; // Skip if no ID
        
        store.dispatch(setPendingRequests([{
            id: data.id,
            sender: data.sender,
            timestamp: data.timestamp,
            profilePicture: data.profilePicture
        }]));
        toast.success(`New friend request from ${data.sender}`);
    });

    socket.on('friend-request-sent-success', (data: FriendRequestEvent) => {
        if (!data.id) return;
        
        store.dispatch(setSentRequests([{
            id: data.id,
            recipient: data.recipient,
            status: 'pending',
            timestamp: data.timestamp,
            profilePicture: data.profilePicture
        }]));
        toast.success(`Friend request sent to ${data.recipient}`);
    });

    socket.on('friend-request-accepted', (data: FriendRequestEvent) => {
        // Clear all requests first
        store.dispatch(clearRequests());
        
        // Get current friends list
        const currentFriends = store.getState().friends.friends;
        const currentUser = store.getState().user.username;
        
        if (currentUser === data.sender) {
            // For the sender: add new friend to existing list
            store.dispatch(setFriends([
                ...currentFriends,
                {
                    username: data.recipient,
                    profilePicture: data.recipientProfile
                }
            ]));
            toast.success(`${data.recipient} accepted your friend request`);
        } else if (currentUser === data.recipient) {
            // For the recipient: add new friend to existing list
            store.dispatch(setFriends([
                ...currentFriends,
                {
                    username: data.sender,
                    profilePicture: data.senderProfile
                }
            ]));
            toast.success(`You are now friends with ${data.sender}`);
        }
        
        // Force a refresh of the friends list
        setTimeout(() => {
            // Try this endpoint instead
            axios.get(`${BASE_URL}/api/friends/${currentUser}`)
                .then(response => {
                    store.dispatch(setFriends(response.data));
                })
                .catch(error => {
                    console.error('Error fetching friends:', error);
                    
                    // Fallback to another possible endpoint format if the first one fails
                    axios.get(`${BASE_URL}/api/users/${currentUser}/friends`)
                        .then(response => {
                            store.dispatch(setFriends(response.data));
                        })
                        .catch(err => {
                            console.error('Error fetching friends (fallback):', err);
                        });
                });
        }, 500);
    });

    socket.on('friend-added', (data: SocketData) => {
        store.dispatch(setFriends(data));
        toast.success('New friend added!');
    });

    socket.on('request-declined', (data: FriendRequestEvent) => {
        store.dispatch(setSentRequests([{
            id: data.id || Date.now().toString(),
            recipient: data.recipient,
            status: 'declined',
            timestamp: data.timestamp,
            profilePicture: data.profilePicture
        }]));
        toast.error(`${data.recipient} declined your friend request`);
    });

    // Listen for direct messages
    socket.on('new-message', (data: SocketMessageEvent) => {
        // Skip if no chatId or if we've already processed this message
        if (!data.chatId || (data.message.id && processedMessageIds.has(data.message.id))) {
            return;
        }
        
        // Add to processed set if it has an ID
        if (data.message.id) {
            processedMessageIds.add(data.message.id);
        }
        
        // Add message to store
        store.dispatch(addMessage({
            chatId: data.chatId,
            message: data.message
        }));
    });

    // Listen for group messages
    socket.on('new-group-message', (data: SocketMessageEvent) => {
        // Skip if we've already processed this message
        if (data.message.id && processedMessageIds.has(data.message.id)) {
            return;
        }
        
        // Add to processed set if it has an ID
        if (data.message.id) {
            processedMessageIds.add(data.message.id);
        }
        
        // Add message to store
        store.dispatch(groupActions.addGroupMessage({
            groupId: data.groupId,
            message: data.message
        }));
    });

    // Add new group member joined listener
    socket.on('group-member-joined', (data: { groupId: string, username: string }) => {
        // Update group members in Redux store
        store.dispatch(groupActions.addGroupMember({
            groupId: data.groupId,
            member: {
                username: data.username,
                profilePicture: null,
                isAdmin: false
            }
        }));
    });

    // Add group invite accepted listener
    socket.on('group-invite-accepted', (data: GroupInviteAcceptedData) => {
        const currentUser = store.getState().user.username;
        
        // Add group directly since server sends correctly formatted data
        store.dispatch(groupActions.addGroup({
            ...data.group,
            isGroup: true
        }));
        
        // Fetch messages for the group
        if (data.username === currentUser) {
            axios.get(`${BASE_URL}/api/groups/${data.groupId}/messages`)
                .then(response => {
                    store.dispatch(groupActions.setGroupMessages({
                        groupId: data.groupId,
                        messages: response.data
                    }));
                    // Force a re-render of the groups list
                    store.dispatch(groupActions.setGroups(
                        Object.values(store.getState().groups.groups)
                    ));
                })
                .catch(error => {
                    console.error('Error fetching messages:', error);
                });
        }
        
        // Show toast notification
        if (data.username !== currentUser) {
            toast.success(`${data.username} joined the group`);
        }
    });

    // Add event-related socket events
    socket.on('event-updated', (data: { groupId: string; event: Event }) => {
        store.dispatch(groupActions.setGroupEvent({
            groupId: data.groupId,
            event: data.event
        }));
        toast.success('Event updated successfully');
    });

    socket.on('expense-added', (data: { groupId: string; expense: Expense; keepEventOpen?: boolean }) => {
        // Update the group with the new expense
        if (data.groupId && data.expense) {
            // Dispatch the expense update to Redux
            store.dispatch(groupActions.addExpense({
                groupId: data.groupId,
                expense: data.expense,
                keepEventOpen: data.keepEventOpen // Pass this flag to the reducer
            }));
        }
    });

    // Inside initializeSocket function, update the venmo_username_updated listener
    socket.on('venmo_username_updated', (data: { username: string; venmoUsername: string }) => {
        
        // Update the user in Redux store
        store.dispatch(setVenmoUsername(data.venmoUsername));
        
        // Update the user in all relevant groups
        const state = store.getState();
        Object.keys(state.groups.groups).forEach(groupId => {
            const group = state.groups.groups[groupId];
            if (group.users.some(u => u.username === data.username)) {
                store.dispatch(groupActions.updateGroupUser({
                    groupId,
                    user: {
                        username: data.username,
                        profilePicture: group.users.find(u => u.username === data.username)?.profilePicture || null,
                        isAdmin: group.users.find(u => u.username === data.username)?.isAdmin || false,
                        venmoUsername: data.venmoUsername
                    }
                }));
            }
        });
    });

    // Inside initializeSocket function, add these event listeners
    socket.on('expense-updated', (data: { groupId: string; expense: any }) => {
        // Get the current event from the store
        const state = store.getState();
        const group = state.groups.groups[data.groupId];
        
        if (group?.currentEvent) {
            // Create a new array of expenses with the updated expense
            const updatedExpenses = group.currentEvent.expenses.map(exp => {
                if (exp.id === data.expense.id || 
                    (exp.item === data.expense.originalItem && exp.paidBy === data.expense.paidBy)) {
                    return data.expense;
                }
                return exp;
            });
            
            // Update the event in the store
            store.dispatch(groupActions.setGroupEvent({
                groupId: data.groupId,
                event: {
                    ...group.currentEvent,
                    expenses: updatedExpenses
                }
            }));
        }
    });

    socket.on('expense-removed', (data: { groupId: string; expenseId: string }) => {
        // Get the current event from the store
        const state = store.getState();
        const group = state.groups.groups[data.groupId];
        
        if (group?.currentEvent) {
            // Filter out the removed expense
            const updatedExpenses = group.currentEvent.expenses.filter(exp => 
                exp.id !== data.expenseId
            );
            
            // Update the event in the store
            store.dispatch(groupActions.setGroupEvent({
                groupId: data.groupId,
                event: {
                    ...group.currentEvent,
                    expenses: updatedExpenses
                }
            }));
        }
    });

    // Update the 'user-added-to-group' event handler
    socket.on('user-added-to-group', async ({ groupId, groupData }: { groupId: string; groupData?: GroupData }) => {
        try {
            // If we received full group data, use it directly
            if (groupData) {
                // Add the group to Redux store with the current event
                store.dispatch(groupActions.addGroup({
                    ...groupData,
                    isGroup: true,
                    // Add missing required properties with default values
                    admin: groupData.admin || '',
                    createdBy: groupData.createdBy || '',
                    createdAt: groupData.createdAt || new Date().toISOString(),
                    updatedAt: groupData.updatedAt || new Date().toISOString()
                }));
                
                // Explicitly set the event in the store to ensure it's properly loaded
                if (groupData.currentEvent) {
                    store.dispatch(groupActions.setGroupEvent({
                        groupId,
                        event: groupData.currentEvent
                    }));
                }
                
                // Fetch messages for the group
                const messagesResponse = await axios.get(`${BASE_URL}/api/groups/${groupId}/messages`);
                store.dispatch(groupActions.setGroupMessages({
                    groupId,
                    messages: messagesResponse.data
                }));
                
                toast.success(`You've been added to ${groupData.name}`);
            } else {
                // Fallback to the old approach if we didn't get full group data
                const response = await axios.get(`${BASE_URL}/api/groups/${groupId}`);
                const fetchedGroupData = response.data;
                
                store.dispatch(groupActions.addGroup({
                    ...fetchedGroupData,
                    isGroup: true,
                    currentEvent: fetchedGroupData.currentEvent
                }));
                
                // Fetch messages for the group
                const messagesResponse = await axios.get(`${BASE_URL}/api/groups/${groupId}/messages`);
                store.dispatch(groupActions.setGroupMessages({
                    groupId,
                    messages: messagesResponse.data
                }));
                
                // Explicitly set the event
                if (fetchedGroupData.currentEvent) {
                    store.dispatch(groupActions.setGroupEvent({
                        groupId,
                        event: fetchedGroupData.currentEvent
                    }));
                }
                
                toast.success(`You've been added to ${fetchedGroupData.name}`);
            }
        } catch (error) {
            console.error('Error processing group data:', error);
            toast.error('Failed to load group data');
        }
    });

    // Add notification listener
    socket.on('notification', (notification: NotificationData) => {
        // Ensure the notification is marked as unread
        const unreadNotification = {
            ...notification,
            read: false
        };
        
        // Store the notification in Redux
        store.dispatch(addNotification(unreadNotification));
    });

    // Add notification marked read listener
    socket.on('notification-marked-read', (data: { id: string }) => {
        // Only dispatch if we have a valid ID
        if (data && data.id) {
            store.dispatch(notificationMarkedRead(data));
        }
    });

    // Add all notifications marked read listener
    socket.on('all-notifications-marked-read', () => {
        store.dispatch(allNotificationsMarkedRead());
    });

    // Add this to your socket initialization
    socket.on('notifications-loaded', (notifications: NotificationData[]) => {
        store.dispatch(setNotifications(notifications));
    });

    // Just add the listener here, don't redeclare the action
    socket.on('all-notifications-cleared', () => {
      store.dispatch(allNotificationsCleared());
    });

    return () => {
        socket.off('new-message');
        socket.off('new-group-message');
        socket.off('new-friend-request');
        socket.off('friend-request-sent-success');
        socket.off('friend-added');
        socket.off('request-accepted');
        socket.off('request-declined');
        socket.off('user-status-changed');
        socket.off('group-member-joined');
        socket.off('group-invite-accepted');
        socket.off('event-updated');
        socket.off('expense-added');
        socket.off('venmo_username_updated');
        socket.off('expense-updated');
        socket.off('expense-removed');
        socket.off('user-added-to-group');
        socket.off('notification');
        socket.off('notification-marked-read');
        socket.off('all-notifications-marked-read');
        socket.emit('leave', username);
    };
};

export const sendMessage = async (messageData: MessageData): Promise<MessageData> => {
    try {
        // Add timestamp if not present
        if (!messageData.timestamp) {
            messageData.timestamp = new Date().toISOString();
        }
        
        // Add a temporary ID to track this message
        const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        messageData.id = messageData.id || tempId;
        
        // Emit the message via socket
        const socket = getSocket();
        if (messageData.chatId.startsWith('group_')) {
            socket.emit('group-message', {
                groupId: messageData.chatId.replace('group_', ''),
                message: messageData
            });
        } else {
            socket.emit('private-message', {
                chatId: messageData.chatId,
                message: messageData
            });
        }
        
        return messageData;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// Helper function for sending friend requests
export const sendFriendRequest = (data: { sender: string; recipient: string }) => {
    socket.emit('friend-request-sent', data);
};

export const acceptFriendRequest = (data: { sender: string; recipient: string }) => {
    socket.emit('friend-request-accepted', data);
};

export const declineFriendRequest = (data: { sender: string; recipient: string }) => {
    socket.emit('friend-request-declined', data);
};

// Add error handler
socket.on('message-error', (error: SocketErrorEvent) => {
    console.error('Message error:', error);
    toast.error('Failed to send message');
});

// Add a helper function to send group invites
export const sendGroupInvite = (data: { groupId: string; username: string; invitedBy: string }) => {
    if (!data.invitedBy) {
        console.error('No invitedBy provided for group invite');
        return;
    }
    socket.emit('group-invite', data);
};

// Add helper functions for emitting event updates
export const updateEvent = (groupId: string, event: Omit<Event, 'updatedAt'> | null) => {
    socket.emit('event-update', { 
        groupId,
        event: event ? {
            ...event,
            id: event.id || Date.now().toString(),
            expenses: event.expenses || []
        } : null 
    });
};

export const addExpense = (groupId: string, expense: Omit<Expense, 'id' | 'createdAt' | 'status'>) => {
    socket.emit('expense-added', { 
        groupId, 
        expense,
        eventTitle: store.getState().groups.groups[groupId]?.currentEvent?.title || 'Event'
    });
};

export const getSocket = () => socket;

// Update the updateVenmoUsername function
export const updateVenmoUsername = async (username: string, venmoUsername: string) => {
    try {
        // First make the API call
        await axios.put(`${BASE_URL}/api/users/${username}`, {
            venmoUsername
        });

        // Then emit the socket event to all connected clients
        socket.emit('update_venmo_username', { username, venmoUsername });

        // Update local Redux store
        store.dispatch(setVenmoUsername(venmoUsername));

        return true;
    } catch (error) {
        console.error('Error updating Venmo username:', error);
        throw error;
    }
};

export const updateExpense = (groupId: string, updatedExpense: any) => {
  const socket = getSocket();
  socket.emit('update-expense', {
    groupId,
    expense: updatedExpense
  });
};

export const removeExpense = (groupId: string, expense: any) => {
  const socket = getSocket();
  socket.emit('remove-expense', {
    groupId,
    expense
  });
};

// Add this function to mark a notification as read via socket
export const markNotificationRead = (username: string, notificationId: string) => {
  socket.emit('mark-notification-read', { username, notificationId });
};

// Add this function to mark all notifications as read
export const markAllNotificationsRead = (username: string) => {
  socket.emit('mark-all-notifications-read', { username });
};

// Add this function to fetch notifications
export const fetchUserNotifications = (username: string) => {
    socket.emit('fetch-notifications', username);
}; 