import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

interface FriendState {
  friends: string[];
  pendingRequests: Array<{ sender: string; createdAt: string }>;
  sentRequests: Array<{ recipient: string; createdAt: string; status: string }>;
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
    const response = await axios.get(`https://divvy-server.onrender.com/api/friends/${username}/friends`);
    return response.data.friends;
  }
);

export const fetchPendingRequests = createAsyncThunk(
  'friends/fetchPendingRequests',
  async (username: string) => {
    const response = await axios.get(`https://divvy-server.onrender.com/api/friends/${username}/pending-requests`);
    return response.data.pendingRequests;
  }
);

export const fetchSentRequests = createAsyncThunk(
  'friends/fetchSentRequests',
  async (username: string) => {
    const response = await axios.get(`https://divvy-server.onrender.com/api/friends/${username}/sent-requests`);
    return response.data.sentRequests;
  }
);

export const sendFriendRequest = createAsyncThunk(
  'friends/sendRequest',
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.post('https://divvy-server.onrender.com/api/friends/send-request', {
      user1,
      user2,
    });
    return { recipient: user2, status: 'pending', message: response.data.message };
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'friends/acceptRequest',
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.post('https://divvy-server.onrender.com/api/friends/accept-request', {
      user1,
      user2,
    });
    return { sender: user1, message: response.data.message };
  }
);

export const declineFriendRequest = createAsyncThunk(
  'friends/declineRequest',
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.post('https://divvy-server.onrender.com/api/friends/decline-request', {
      user1,
      user2,
    });
    return { sender: user1, message: response.data.message };
  }
);

const friendsSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {},
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
          recipient: action.payload.recipient,
          status: action.payload.status,
          createdAt: new Date().toISOString(),
        });
      })
      // Accept Friend Request
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        state.pendingRequests = state.pendingRequests.filter(
          (request) => request.sender !== action.payload.sender
        );
        state.friends.push(action.payload.sender);
      })
      // Decline Friend Request
      .addCase(declineFriendRequest.fulfilled, (state, action) => {
        state.pendingRequests = state.pendingRequests.filter(
          (request) => request.sender !== action.payload.sender
        );
      });
  },
});

export default friendsSlice.reducer; 