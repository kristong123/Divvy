import { AppDispatch } from "../store/store";
import { setUser, forceProfileRefresh } from "../store/slice/userSlice";
import { groupActions } from "../store/slice/groupSlice";
import axios from "axios";
import { BASE_URL } from "../config/api";
import { store } from "../store/store";
import { setMessages, setLoading } from "../store/slice/chatSlice";
import { setFriends } from "../store/slice/friendsSlice";
import { addGroupInvite } from "../store/slice/groupSlice";

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
    // Login logic
    const response = await axios.post<UserData>(`${BASE_URL}/api/auth/login`, {
      username,
      password,
    });

    // Add a timestamp to prevent caching
    const profilePicture = response.data.profilePicture
      ? `${response.data.profilePicture}?t=${Date.now()}`
      : null;

    // Store token and user data with venmoUsername
    localStorage.setItem("token", response.data.token);

    // Dispatch user data including venmoUsername from login response
    dispatch(
      setUser({
        username: response.data.username,
        profilePicture: profilePicture,
        venmoUsername: response.data.venmoUsername,
      })
    );

    // Force a refresh of the profile picture
    if (profilePicture) {
      dispatch(forceProfileRefresh());
    }

    // Load additional user data
    await loadUserData(username, dispatch);

    return response.data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  // Clear Redux store
  store.dispatch(groupActions.setGroups([]));
  store.dispatch(groupActions.setGroupMessages({ groupId: "", messages: [] }));
  // ... other cleanup
};

// ... rest of your existing auth functions
