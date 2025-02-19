import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { store } from '../store/store';
import { setFriends, setPendingRequests, setSentRequests, clearRequests } from '../store/slice/friendsSlice';
import { addMessage } from '../store/slice/chatSlice';
import { toast } from 'react-hot-toast';
import { MessageData, SocketMessageEvent, SocketErrorEvent, UserStatusEvent, FriendRequestEvent } from '../types/messages';
import { groupActions } from '../store/slice/groupSlice';
import axios from 'axios';
import { BASE_URL } from '../config/api';

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

interface Event {
    id: string;
    name: string;
    date: string;
    description: string;
    expenses: Expense[];
    updatedAt: string;
}

export const initializeSocket = (username: string) => {
    socket.emit('join', username);
    console.log('Joining socket room:', username);

    // Friend request events with real-time updates
    socket.on('new-friend-request', (data: FriendRequestEvent) => {
        console.log('Received friend request:', data);
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
        console.log('Friend request sent:', data);
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
        console.log('Friend request accepted:', data);
        // Clear all requests first
        store.dispatch(clearRequests());
        
        // Get current friends list
        const currentFriends = store.getState().friends.friends;
        
        if (store.getState().user.username === data.sender) {
            // For the sender: add new friend to existing list
            store.dispatch(setFriends([
                ...currentFriends,
                {
                    username: data.recipient,
                    profilePicture: data.recipientProfile
                }
            ]));
            toast.success(`${data.recipient} accepted your friend request`);
        } else {
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
    });

    socket.on('friend-added', (data: any) => {
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
        if (!data.chatId) return; // Skip if no chatId
        store.dispatch(addMessage({
            chatId: data.chatId,
            message: data.message
        }));
    });

    // Listen for group messages
    socket.on('new-group-message', (data: SocketMessageEvent) => {
        store.dispatch(groupActions.addGroupMessage({
            groupId: data.groupId,
            message: data.message
        }));
    });

    // Listen for user status changes
    socket.on('user-status-changed', (data: UserStatusEvent) => {
        // Update UI to show user status
        console.log(`User ${data.username} is now ${data.status}`);
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

    socket.on('expense-added', (data: { 
        groupId: string; 
        expense: Expense;
        currentEvent: Event;
    }) => {
        store.dispatch(groupActions.setGroupEvent({
            groupId: data.groupId,
            event: data.currentEvent
        }));
        toast.success(`New expense added: ${data.expense.item}`);
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
        socket.emit('leave', username);
    };
};

export const sendMessage = async (messageData: MessageData) => {
    try {
        // Emit through socket only - remove HTTP call
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
        
        return messageData; // Return the message data directly
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// Helper function for sending friend requests
export const sendFriendRequest = (data: { sender: string; recipient: string }) => {
    console.log('Sending friend request:', data);
    socket.emit('friend-request-sent', data);
};

export const acceptFriendRequest = (data: { sender: string; recipient: string }) => {
    console.log('Accepting friend request:', data);
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
    console.log('Sending group invite:', data);
    if (!data.invitedBy) {
        console.error('No invitedBy provided for group invite');
        return;
    }
    socket.emit('group-invite', data);
};

// Add helper functions for emitting event updates
export const updateEvent = (groupId: string, event: Omit<Event, 'updatedAt'>) => {
    socket.emit('event-update', { groupId, event });
};

export const addExpense = (groupId: string, expense: Omit<Expense, 'id' | 'createdAt' | 'status'>) => {
    socket.emit('expense-added', { groupId, expense });
};

export const getSocket = () => socket; 