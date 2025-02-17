import { AppDispatch } from '../store/store';
import { setUser } from '../store/slice/userSlice';
import { groupActions } from '../store/slice/groupSlice';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { store } from '../store/store';

// Load user's groups and messages after login
const loadUserData = async (username: string, dispatch: AppDispatch) => {
    try {
        // Fetch all user's groups
        const groupsResponse = await axios.get(`${BASE_URL}/api/groups/user/${username}`);
        dispatch(groupActions.setGroups(groupsResponse.data));

        // Fetch messages for each group
        const messagePromises = groupsResponse.data.map(async (group: any) => {
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

        // Store token and user data
        localStorage.setItem('token', response.data.token);
        dispatch(setUser(response.data));

        // Load additional user data
        await loadUserData(username, dispatch);

        return response.data;
    } catch (error) {
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