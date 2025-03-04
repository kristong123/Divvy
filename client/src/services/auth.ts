import { AppDispatch } from "../store/store";
import { setUser } from "../store/slice/userSlice";
import { groupActions } from "../store/slice/groupSlice";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { store } from "../store/store";
import { setMessages, setLoading } from "../store/slice/chatSlice";
import { setFriends } from "../store/slice/friendsSlice";
import { addGroupInvite } from "../store/slice/groupSlice";
import { initializeSocket } from "./socketService";

// Update UserData interface
interface UserData {
  username: string;
  profilePicture: string | null; // Change from string | undefined to string | null
  venmoUsername?: string;
  isAdmin?: boolean;
  token: string; // Add token property
}

// Load user's groups and messages after login
export const loadUserData = async (username: string, dispatch: AppDispatch) => {
  try {
    // Set loading state
    dispatch(setLoading(true));

    // Load friends, groups, and invites
    const [groupsResponse, friendsResponse, invitesResponse] =
      await Promise.all([
        axios.get(`${BASE_URL}/api/groups/user/${username}`),
        axios.get(`${BASE_URL}/api/friends/${username}`),
        axios.get(`${BASE_URL}/api/groups/invites/${username}`),
      ]);

    // Process groups
    dispatch(groupActions.setGroups(groupsResponse.data));

    // Process friends
    dispatch(setFriends(friendsResponse.data));

    // Process invites
    invitesResponse.data.forEach(
      (invite: {
        id: string;
        groupId: string;
        groupName: string;
        invitedBy: string;
        timestamp: string;
      }) => {
        dispatch(
          addGroupInvite({
            username,
            invite: {
              id: invite.id,
              groupId: invite.groupId,
              groupName: invite.groupName,
              invitedBy: invite.invitedBy,
            },
          })
        );
      }
    );

    // Then load messages sequentially to ensure they're all loaded
    for (const friend of friendsResponse.data) {
      const chatId = [username, friend.username].sort().join("_");
      try {
        const response = await axios.get(`${BASE_URL}/api/messages/${chatId}`);
        dispatch(setMessages({ chatId, messages: response.data }));
      } catch (error) {
        console.error(`Failed to load messages for chat ${chatId}:`, error);
      }
    }

    for (const group of groupsResponse.data) {
      try {
        const response = await axios.get(
          `${BASE_URL}/api/groups/${group.id}/messages`
        );
        dispatch(
          groupActions.setGroupMessages({
            groupId: group.id,
            messages: response.data,
          })
        );
      } catch (error) {
        console.error(`Failed to load messages for group ${group.id}:`, error);
      }
    }

    dispatch(setLoading(false));
  } catch (error) {
    console.error("Error in loadUserData:", error);
    dispatch(setLoading(false));
    throw error;
  }
};

// Login user and load their data
export const login = async (
  username: string,
  password: string,
  dispatch: AppDispatch
): Promise<UserData> => {
  try {
    console.log(`🔑 Authenticating user: ${username}`);
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username,
      password,
    });
    
    // Add a timestamp to the profile picture URL to prevent caching
    const profilePictureWithTimestamp = response.data.profilePicture
      ? `${response.data.profilePicture}?t=${Date.now()}`
      : null;
    
    const userData: UserData = {
      username: response.data.username,
      profilePicture: profilePictureWithTimestamp,
      venmoUsername: response.data.venmoUsername || null,
      token: response.data.token || '',
    };

    // Store user data in Redux
    dispatch(setUser({
      username: userData.username,
      profilePicture: userData.profilePicture,
      venmoUsername: userData.venmoUsername,
    }));

    console.log(`✅ Authentication successful for: ${username}`);
    
    // Initialize socket connection
    initializeSocket(userData.username);

    return userData;
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    
    // Add more detailed error logging
    if (axios.isAxiosError(error) && error.response) {
      console.error('Server response:', error.response.data);
      console.error('Status code:', error.response.status);
    }
    
    throw error;
  }
};

export const logout = () => {
  console.log('👋 User logged out');
  
  // Clear Redux store
  store.dispatch(groupActions.setGroups([]));
  store.dispatch(groupActions.setGroupMessages({ groupId: "", messages: [] }));
  // ... other cleanup
};

// ... rest of your existing auth functions
