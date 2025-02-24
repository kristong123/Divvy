import { AppDispatch } from '../store/store';
import { setUser } from '../store/slice/userSlice';
import { groupActions } from '../store/slice/groupSlice';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { store } from '../store/store';

// Load user's groups and messages after login
const loadUserData = async (username: string, dispatch: AppDispatch) => {
    try {
        const groupsResponse = await axios.get(`${BASE_URL}/api/groups/user/${username}`);
        const groupsArray = groupsResponse.data.map((group: any) => {
            const transformed = {
                ...group,
                isGroup: true,
                currentEvent: group.currentEvent || null,
                createdAt: group.createdAt?._seconds ? 
                    new Date(group.createdAt._seconds * 1000).toISOString() : 
                    group.createdAt,
                updatedAt: group.updatedAt?._seconds ? 
                    new Date(group.updatedAt._seconds * 1000).toISOString() : 
                    group.updatedAt
            };
            return transformed;
        });

        dispatch(groupActions.setGroups(groupsArray));
        
        // Fetch messages for each group
        const messagePromises = groupsArray.map(async (group: any) => {
            const messagesResponse = await axios.get(`${BASE_URL}/api/groups/${group.id}/messages`);
            return {
                groupId: group.id,
                messages: messagesResponse.data
            };
        });

        const allMessages = await Promise.all(messagePromises);
        allMessages.forEach(({ groupId, messages }) => {
            dispatch(groupActions.setGroupMessages({ groupId, messages }));
        });
    } catch (error) {
        console.error('Error in loadUserData:', error);
        throw error;
    }
};

// Login user and load their data
export const login = async (username: string, password: string, dispatch: AppDispatch) => {
    try {
        // Login logic
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            username,
            password
        });
        
        // Store token and user data with venmoUsername
        localStorage.setItem('token', response.data.token);
        
        // Dispatch user data including venmoUsername from login response
        dispatch(setUser({
            username: response.data.username,
            profilePicture: response.data.profilePicture,
            venmoUsername: response.data.venmoUsername  // Use venmoUsername directly from login response
        }));

        // Load additional user data
        await loadUserData(username, dispatch);

        return response.data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    // Clear Redux store
    store.dispatch(groupActions.setGroups([]));
    store.dispatch(groupActions.setGroupMessages({ groupId: '', messages: [] }));
    // ... other cleanup
};

// ... rest of your existing auth functions 