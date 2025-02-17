import io from 'socket.io-client';
import { SOCKET_URL } from '../config/api';
import { store } from '../store/store';
import { setFriends, setPendingRequests, setSentRequests } from '../store/slice/friendsSlice';
import { addMessage } from '../store/slice/chatSlice';
import { toast } from 'react-hot-toast';
import { MessageData, SocketMessageEvent, SocketErrorEvent, UserStatusEvent, FriendRequestEvent } from '../types/messages';

const socket = io(SOCKET_URL);

export const initializeSocket = (username: string) => {
    // Join user's room
    socket.emit('join', username);
    socket.emit('user-online', username);

    // Listen for new messages
    socket.on('new-message', (data: SocketMessageEvent) => {
        store.dispatch(addMessage({
            chatId: data.chatId,
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
        socket.off('new-friend-request');
        socket.off('friend-request-accepted');
        socket.off('friend-request-declined');
        socket.off('user-status-changed');
        socket.emit('leave', username);
    };
};

export const sendMessage = (data: MessageData) => {
    console.log('Sending message:', data); // Debug log
    socket.emit('private-message', data);
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