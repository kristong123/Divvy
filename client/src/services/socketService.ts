import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { store } from '../store/store';
import { setFriends, setPendingRequests, setSentRequests } from '../store/slice/friendsSlice';
import { addMessage } from '../store/slice/chatSlice';
import { toast } from 'react-hot-toast';
import { MessageData, SocketMessageEvent, SocketErrorEvent, UserStatusEvent, FriendRequestEvent } from '../types/messages';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { groupActions } from '../store/slice/groupSlice';

const socket = io(SOCKET_URL);

export const initializeSocket = (username: string) => {
    // Join user's room
    socket.emit('join', username);
    socket.emit('user-online', username);

    // Listen for direct messages
    socket.on('new-message', (data: SocketMessageEvent) => {
        store.dispatch(addMessage({
            chatId: data.chatId,
            message: data.message
        }));
    });

    // Listen for group messages
    socket.on('new-group-message', (data: SocketMessageEvent) => {
        store.dispatch(addMessage({
            chatId: `group_${data.groupId}`,
            message: data.message
        }));
    });

    // Listen for friend requests
    socket.on('new-friend-request', (data: FriendRequestEvent) => {
        store.dispatch(setPendingRequests(data));
        toast.success(`New friend request from ${data.sender}`);
    });

    socket.on('friend-request-accepted', (data: FriendRequestEvent) => {
        store.dispatch(setFriends(data));
        toast.success(`${data.recipient} accepted your friend request`);
    });

    socket.on('friend-request-declined', (data: FriendRequestEvent) => {
        store.dispatch(setSentRequests(data));
        toast.error(`${data.recipient} declined your friend request`);
    });

    // Listen for user status changes
    socket.on('user-status-changed', (data: UserStatusEvent) => {
        // Update UI to show user status
        console.log(`User ${data.username} is now ${data.status}`);
    });

    return () => {
        socket.off('new-message');
        socket.off('new-group-message');
        socket.off('new-friend-request');
        socket.off('friend-request-accepted');
        socket.off('friend-request-declined');
        socket.off('user-status-changed');
        socket.emit('leave', username);
    };
};

export const sendMessage = async (data: MessageData) => {
    if (data.chatId.startsWith('group_')) {
        const groupId = data.chatId.replace('group_', '');
        
        // Emit socket event immediately for instant UI update
        socket.emit('group-message', {
            groupId,
            message: {
                ...data,
                timestamp: new Date().toISOString()
            }
        });

        // Save to database in background
        try {
            await axios.post(`${BASE_URL}/api/groups/${groupId}/messages`, {
                content: data.content,
                senderId: data.senderId
            });
        } catch (error) {
            toast.error('Failed to save message');
        }
    } else {
        // Direct messages remain the same
        socket.emit('private-message', data);
    }
};

export const sendFriendRequest = (data: any) => {
    socket.emit('friend-request', data);
};

export const acceptFriendRequest = (data: any) => {
    socket.emit('friend-request-accepted', data);
};

export const declineFriendRequest = (data: any) => {
    socket.emit('friend-request-declined', data);
};

// Add error handler
socket.on('message-error', (error: SocketErrorEvent) => {
    console.error('Message error:', error);
    toast.error('Failed to send message');
});

export default socket; 