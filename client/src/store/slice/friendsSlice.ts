import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { BASE_URL } from "../../config/api";
import { PayloadAction } from "@reduxjs/toolkit";
import { AppDispatch } from "../store";

interface PendingRequest {
  id: string;
  sender: string;
  timestamp: string;
  profilePicture?: string | null;
}

interface SentRequest {
  id: string;
  recipient: string;
  timestamp: string;
  status: string;
  profilePicture?: string | null;
}

interface Friend {
  username: string;
  profilePicture: string | null;
}

// Interface for cached profile pictures
interface CachedProfilePicture {
  username: string;
  imageSource: string; // The original path or URL
  downloadUrl: string; // The actual download URL
  isValid: boolean;
  lastUpdated: number; // Timestamp for cache invalidation
  useProxy?: boolean; // Whether to use a proxy for this image
}

interface FriendState {
  friends: Friend[];
  pendingRequests: PendingRequest[];
  sentRequests: SentRequest[];
  loading: boolean;
  error: string | null;
  // Add profile picture cache
  profilePictureCache: { [username: string]: CachedProfilePicture };
}

const initialState: FriendState = {
  friends: [],
  pendingRequests: [],
  sentRequests: [],
  loading: false,
  error: null,
  profilePictureCache: {},
};

// Async thunks for API calls
export const fetchFriends = createAsyncThunk(
  "friends/fetchFriends",
  async (username: string) => {
    const response = await axios.get(`${BASE_URL}/api/friends/${username}`);
    return response.data;
  }
);

export const fetchPendingRequests = createAsyncThunk(
  "friends/fetchPendingRequests",
  async (username: string) => {
    const response = await axios.get(
      `${BASE_URL}/api/friends/requests/${username}`
    );
    return response.data;
  }
);

export const fetchSentRequests = createAsyncThunk(
  "friends/fetchSentRequests",
  async (username: string) => {
    const response = await axios.get(
      `${BASE_URL}/api/friends/sent/${username}`
    );
    return response.data;
  }
);

export const sendFriendRequest = createAsyncThunk(
  "friends/sendRequest",
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.post(`${BASE_URL}/api/friends/add`, {
      user1,
      user2,
    });
    return {
      id: response.data.id,
      recipient: user2,
      status: "pending",
      message: response.data.message,
      profilePicture: response.data.profilePicture,
    };
  }
);

const friendsSlice = createSlice({
  name: "friends",
  initialState,
  reducers: {
    setFriends: (state, action: PayloadAction<Friend[]>) => {
      // Create a map to deduplicate friends by username
      const friendsMap = new Map<string, Friend>();
      
      // Add existing friends to the map
      state.friends.forEach(friend => {
        friendsMap.set(friend.username, friend);
      });
      
      // Add new friends, overwriting any existing ones with the same username
      action.payload.forEach(friend => {
        friendsMap.set(friend.username, friend);
      });
      
      // Convert map back to array
      state.friends = Array.from(friendsMap.values());
    },
    setPendingRequests: (state, action: PayloadAction<PendingRequest[]>) => {
      // Create a map of sender -> request
      const requestMap = new Map();

      // First add existing requests to the map (that aren't in the new batch)
      state.pendingRequests.forEach((request) => {
        requestMap.set(request.sender, request);
      });

      // Then add new requests, overwriting any existing ones with the same sender
      action.payload.forEach((request) => {
        requestMap.set(request.sender, request);
      });

      // Convert map back to array
      state.pendingRequests = Array.from(requestMap.values());
    },
    setSentRequests: (state, action: PayloadAction<SentRequest[]>) => {
      // Check for duplicates before adding
      const newRequests = action.payload.filter(
        (newReq) =>
          !state.sentRequests.some(
            (existingReq) => existingReq.id === newReq.id
          )
      );
      state.sentRequests = [...state.sentRequests, ...newRequests];
    },
    clearRequests: (state) => {
      state.pendingRequests = [];
      state.sentRequests = [];
    },
    removePendingRequest: (state, action: PayloadAction<string>) => {
      state.pendingRequests = state.pendingRequests.filter(
        (request) => request.sender !== action.payload
      );
    },
    // Profile picture caching actions
    cacheProfilePicture: (
      state,
      action: PayloadAction<{
        username: string;
        imageSource: string;
        downloadUrl: string;
        isValid: boolean;
        useProxy?: boolean;
      }>
    ) => {
      const { username, imageSource, downloadUrl, isValid, useProxy } = action.payload;
      state.profilePictureCache[username] = {
        username,
        imageSource,
        downloadUrl,
        isValid,
        useProxy,
        lastUpdated: Date.now(),
      };
    },
    clearProfilePictureCache: (
      state,
      action: PayloadAction<string> // username
    ) => {
      delete state.profilePictureCache[action.payload];
    },
    clearAllProfilePictureCache: (state) => {
      state.profilePictureCache = {};
    },
    forceProfilePictureRefresh: (
      state,
      action: PayloadAction<string> // username
    ) => {
      const username = action.payload;
      if (state.profilePictureCache[username]) {
        // Add a timestamp to the URL to force a refresh
        const url = state.profilePictureCache[username].downloadUrl;
        state.profilePictureCache[username].downloadUrl = url.includes("?")
          ? url.split("?")[0] + "?t=" + Date.now()
          : url + "?t=" + Date.now();
        state.profilePictureCache[username].lastUpdated = Date.now();
      }
    },
    updateFriendProfilePicture: (
      state,
      action: PayloadAction<{
        username: string;
        profilePicture: string;
      }>
    ) => {
      const { username, profilePicture } = action.payload;
      
      // Update in friends list
      const friendIndex = state.friends.findIndex(friend => friend.username === username);
      if (friendIndex !== -1) {
        state.friends[friendIndex].profilePicture = profilePicture;
      }
      
      // Update in pending requests
      const pendingIndex = state.pendingRequests.findIndex(request => request.sender === username);
      if (pendingIndex !== -1) {
        state.pendingRequests[pendingIndex].profilePicture = profilePicture;
      }
      
      // Update in sent requests
      const sentIndex = state.sentRequests.findIndex(request => request.recipient === username);
      if (sentIndex !== -1) {
        state.sentRequests[sentIndex].profilePicture = profilePicture;
      }
      
      // Update in cache
      if (state.profilePictureCache[username]) {
        state.profilePictureCache[username] = {
          ...state.profilePictureCache[username],
          imageSource: profilePicture,
          downloadUrl: profilePicture,
          isValid: true,
          lastUpdated: Date.now()
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Friends
      .addCase(fetchFriends.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFriends.fulfilled, (state, action) => {
        state.friends = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchFriends.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch friends";
      })
      // Fetch Pending Requests
      .addCase(fetchPendingRequests.fulfilled, (state, action) => {
        state.pendingRequests = action.payload;
      })
      // Fetch Sent Requests
      .addCase(fetchSentRequests.fulfilled, (state, action) => {
        state.sentRequests = action.payload;
      })
      // Send Friend Request
      .addCase(sendFriendRequest.fulfilled, (state, action) => {
        state.sentRequests.push({
          id: action.payload.id || Date.now().toString(),
          recipient: action.payload.recipient,
          status: action.payload.status,
          timestamp: new Date().toISOString(),
          profilePicture: action.payload.profilePicture,
        });
      });
  },
});

export const {
  setFriends,
  setPendingRequests,
  setSentRequests,
  clearRequests,
  removePendingRequest,
  // Export profile picture caching actions
  cacheProfilePicture,
  clearProfilePictureCache,
  clearAllProfilePictureCache,
  forceProfilePictureRefresh,
  updateFriendProfilePicture,
} = friendsSlice.actions;

// Helper function to accept a friend request
export const acceptFriendRequest = (
  requestId: string,
  sender: string,
  profilePicture: string | null
) => {
  return async (dispatch: AppDispatch) => {
    try {
      await axios.post(`${BASE_URL}/api/friends/accept`, {
        requestId,
      });

      // Add the sender to friends list
      dispatch(
        setFriends([
          {
            username: sender,
            profilePicture,
          },
        ])
      );

      // Remove from pending requests
      dispatch(removePendingRequest(sender));
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };
};

// Socket.IO event handlers
export const setupFriendsListeners = 
  (username: string) => 
  async (dispatch: AppDispatch): Promise<() => void> => {
    const fetchInitialData = async () => {
      try {
        const [friendsRes, pendingRes, sentRes] = await Promise.all([
          axios.get(`${BASE_URL}/api/friends/${username}`),
          axios.get(`${BASE_URL}/api/friends/requests/${username}`),
          axios.get(`${BASE_URL}/api/friends/sent/${username}`),
        ]);

        dispatch(setFriends(friendsRes.data));
        dispatch(setPendingRequests(pendingRes.data));
        dispatch(setSentRequests(sentRes.data));
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    await fetchInitialData();

    // Return the cleanup function
    return () => {
      // cleanup logic
    };
  };

export default friendsSlice.reducer;
