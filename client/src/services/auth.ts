import { AppDispatch } from '../store/store';
import { setUser } from '../store/slice/userSlice';
import { groupActions } from '../store/slice/groupSlice';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { store } from '../store/store';
import { setMessages, setLoading } from '../store/slice/chatSlice';

// Add GroupData interface
interface GroupData {
  id: string;
  name: string;
  currentEvent: Event | null;
  createdAt: {
    _seconds: number;
    _nanoseconds: number;
  } | string;
  updatedAt: {
    _seconds: number;
    _nanoseconds: number;
  } | string;
  users: Array<{
    username: string;
    profilePicture: string | null;
    isAdmin: boolean;
  }>;
}

// Update UserData interface
interface UserData {
  username: string;
  profilePicture: string | null;  // Change from string | undefined to string | null
  venmoUsername?: string;
  isAdmin?: boolean;
  token: string;  // Add token property
}

// Load user's groups and messages after login
export const loadUserData = async (username: string, dispatch: AppDispatch) => {
    try {
        // Set loading state
        dispatch(setLoading(true));

        // First load friends and groups
        const [groupsResponse, friendsResponse] = await Promise.all([
            axios.get(`${BASE_URL}/api/groups/user/${username}`),
            axios.get(`${BASE_URL}/api/friends/${username}`)
        ]);

        // Process groups first
        const groupsArray = groupsResponse.data.map((group: GroupData) => {
            const formatTimestamp = (timestamp: GroupData['createdAt'] | GroupData['updatedAt']) => {
                if (typeof timestamp === 'string') return timestamp;
                if ('_seconds' in timestamp) {
                    return new Date(timestamp._seconds * 1000).toISOString();
                }
                return new Date().toISOString(); // fallback
            };

            return {
                ...group,
                isGroup: true,
                currentEvent: group.currentEvent || null,
                createdAt: formatTimestamp(group.createdAt),
                updatedAt: formatTimestamp(group.updatedAt)
            };
        });

        dispatch(groupActions.setGroups(groupsArray));

        // Then load messages sequentially to ensure they're all loaded
        for (const friend of friendsResponse.data) {
            const chatId = [username, friend.username].sort().join('_');
            try {
                const response = await axios.get(`${BASE_URL}/api/messages/${chatId}`);
                dispatch(setMessages({ chatId, messages: response.data }));
            } catch (error) {
                console.error(`Failed to load messages for chat ${chatId}:`, error);
            }
        }

        for (const group of groupsArray) {
            try {
                const response = await axios.get(`${BASE_URL}/api/groups/${group.id}/messages`);
                dispatch(groupActions.setGroupMessages({ 
                    groupId: group.id, 
                    messages: response.data 
                }));
            } catch (error) {
                console.error(`Failed to load messages for group ${group.id}:`, error);
            }
        }

        dispatch(setLoading(false));
    } catch (error) {
        console.error('Error in loadUserData:', error);
        dispatch(setLoading(false));
        throw error;
    }
};

// Login user and load their data
export const login = async (username: string, password: string, dispatch: AppDispatch): Promise<UserData> => {
    try {
        // Login logic
        const response = await axios.post<UserData>(`${BASE_URL}/api/auth/login`, {
            username,
            password
        });
        
        // Store token and user data with venmoUsername
        localStorage.setItem('token', response.data.token);
        
        // Dispatch user data including venmoUsername from login response
        dispatch(setUser({
            username: response.data.username,
            profilePicture: response.data.profilePicture,
            venmoUsername: response.data.venmoUsername
        }));
        
        // Also fetch user data directly to ensure we have the latest venmoUsername
        try {
            const userResponse = await axios.get(`${BASE_URL}/api/users/${username}`);
            
            if (userResponse.data.venmoUsername) {
                dispatch(setUser({
                    username: response.data.username,
                    profilePicture: response.data.profilePicture,
                    venmoUsername: userResponse.data.venmoUsername
                }));
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
        
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