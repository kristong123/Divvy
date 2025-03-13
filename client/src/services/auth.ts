import { AppDispatch } from "../store/store";
import { loginUser } from "../store/slice/userSlice";
import { fetchUserGroups, fetchGroupMessages, fetchGroupInvites } from "../store/slice/groupSlice";
import { fetchChatMessages, setLoading } from "../store/slice/chatSlice";
import { fetchFriends } from "../store/slice/friendsSlice";
import { store } from "../store/store";
import { groupActions } from "../store/slice/groupSlice";

// Update UserData interface
interface UserData {
  username: string;
  profilePicture: string | null;
  venmoUsername?: string;
  isAdmin?: boolean;
  token: string;
}

// Load user's groups and messages after login
export const loadUserData = async (username: string, dispatch: AppDispatch) => {
  try {
    // Set loading state
    dispatch(setLoading(true));

    // Load friends, groups, and invites using AsyncThunks
    await Promise.all([
      dispatch(fetchUserGroups(username)),
      dispatch(fetchFriends(username)),
      dispatch(fetchGroupInvites(username)),
    ]);

    // Get the loaded data from the store
    const state = store.getState();
    const friends = state.friends.friends;
    const groups = Object.values(state.groups.groups);

    // Then load messages sequentially to ensure they're all loaded
    for (const friend of friends) {
      const chatId = [username, friend.username].sort().join("_");
      try {
        await dispatch(fetchChatMessages(chatId));
      } catch (error) {
        console.error(`Failed to load messages for chat ${chatId}:`, error);
      }
    }

    for (const group of groups) {
      try {
        await dispatch(fetchGroupMessages(group.id));
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
    // Use the loginUser AsyncThunk
    const resultAction = await dispatch(loginUser({ username, password }));
    
    if (loginUser.fulfilled.match(resultAction)) {
      // Return the user data from the fulfilled action
      return resultAction.payload;
    } else {
      throw new Error("Login failed");
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error);
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
