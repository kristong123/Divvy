import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { BASE_URL } from '../../config/api';
import { PayloadAction } from '@reduxjs/toolkit';

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
  'friends/fetchFriends',
  async (username: string) => {
    const response = await axios.get(`${BASE_URL}/api/friends/${username}`);
    return response.data;
  }
);

export const fetchPendingRequests = createAsyncThunk(
  'friends/fetchPendingRequests',
  async (username: string) => {
    const response = await axios.get(`${BASE_URL}/api/friends/requests/${username}`);
    console.log('Pending requests response:', response.data);
    return response.data;
  }
);

export const fetchSentRequests = createAsyncThunk(
  'friends/fetchSentRequests',
  async (username: string) => {
    const response = await axios.get(`${BASE_URL}/api/friends/sent/${username}`);
    console.log('Sent requests response:', response.data);
    return response.data;
  }
);

export const sendFriendRequest = createAsyncThunk(
  'friends/sendRequest',
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.post(`${BASE_URL}/api/friends/add`, {
      user1,
      user2,
    });
    return { 
      id: response.data.id,
      recipient: user2, 
      status: 'pending', 
      message: response.data.message,
      profilePicture: response.data.profilePicture
    };
  }
);

const friendsSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    setFriends: (state, action) => {
      state.friends = action.payload;
    },
    setPendingRequests: (state, action: PayloadAction<PendingRequest[]>) => {
      // Check for duplicates before adding
      const newRequests = action.payload.filter(newReq => 
        !state.pendingRequests.some(existingReq => existingReq.id === newReq.id)
      );
      state.pendingRequests = [...state.pendingRequests, ...newRequests];
    },
    setSentRequests: (state, action: PayloadAction<SentRequest[]>) => {
      // Check for duplicates before adding
      const newRequests = action.payload.filter(newReq => 
        !state.sentRequests.some(existingReq => existingReq.id === newReq.id)
      );
      state.sentRequests = [...state.sentRequests, ...newRequests];
    },
    clearRequests: (state) => {
      state.pendingRequests = [];
      state.sentRequests = [];
    }
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
        state.error = action.error.message || 'Failed to fetch friends';
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
          profilePicture: action.payload.profilePicture
        });
      });
  },
});

export const { setFriends, setPendingRequests, setSentRequests, clearRequests } = friendsSlice.actions;

// Socket.IO event handlers
export const setupFriendsListeners = (username: string) => async (dispatch: any) => {
  const fetchInitialData = async () => {
    try {
      const [friendsRes, pendingRes, sentRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/friends/${username}`),
        axios.get(`${BASE_URL}/api/friends/requests/${username}`),
        axios.get(`${BASE_URL}/api/friends/sent/${username}`)
      ]);

      dispatch(setFriends(friendsRes.data));
      dispatch(setPendingRequests(pendingRes.data));
      dispatch(setSentRequests(sentRes.data));
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  await fetchInitialData();
};

export default friendsSlice.reducer;