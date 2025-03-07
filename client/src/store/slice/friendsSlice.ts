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

interface FriendState {
  friends: Friend[];
  pendingRequests: PendingRequest[];
  sentRequests: SentRequest[];
  loading: boolean;
  error: string | null;
}

const initialState: FriendState = {
  friends: [],
  pendingRequests: [],
  sentRequests: [],
  loading: false,
  error: null,
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
} = friendsSlice.actions;

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
