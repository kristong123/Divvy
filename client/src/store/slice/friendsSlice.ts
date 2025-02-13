import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import io from 'socket.io-client';
import { BASE_URL, SOCKET_URL } from '../../config/api';

const socket = io(SOCKET_URL);

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
    const response = await axios.get(`${BASE_URL}/friends/${username}/friends`);
    return response.data.friends;
  }
);

export const fetchPendingRequests = createAsyncThunk(
  'friends/fetchPendingRequests',
  async (username: string) => {
    const response = await axios.get(`${BASE_URL}/friends/${username}/pending-requests`);
    return response.data.pendingRequests;
  }
);

export const fetchSentRequests = createAsyncThunk(
  'friends/fetchSentRequests',
  async (username: string) => {
    const response = await axios.get(`${BASE_URL}/friends/${username}/sent-requests`);
    return response.data.sentRequests;
  }
);

export const sendFriendRequest = createAsyncThunk(
  'friends/sendRequest',
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.post(`${BASE_URL}/friends/send-request`, {
      user1,
      user2,
    });
    return { recipient: user2, status: 'pending', message: response.data.message };
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'friends/acceptRequest',
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.put(`${BASE_URL}/friends/accept-request`, {
      user1,
      user2,
    });
    return { sender: user1, message: response.data.message };
  }
);

export const declineFriendRequest = createAsyncThunk(
  'friends/declineRequest',
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.delete(`${BASE_URL}/friends/decline-request`, {
      data: { user1, user2 }
    });
    return { sender: user1, message: response.data.message };
  }
);

const friendsSlice = createSlice({
  name: 'friends',
  initialState,
  reducers: {
    setFriends: (state, action) => {
      state.friends = action.payload;
    },
    setPendingRequests: (state, action) => {
      state.pendingRequests = action.payload;
    },
    setSentRequests: (state, action) => {
      state.sentRequests = action.payload;
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

export const { setFriends, setPendingRequests, setSentRequests } = friendsSlice.actions;

// Socket.IO event handlers
export const setupFriendsListeners = (username: string) => async (dispatch: any) => {
  // Initial data fetch
  const fetchInitialData = async () => {
    try {
      const [friendsRes, pendingRes, sentRes] = await Promise.all([
        axios.get(`${BASE_URL}/friends/${username}/friends`),
        axios.get(`${BASE_URL}/friends/${username}/pending-requests`),
        axios.get(`${BASE_URL}/friends/${username}/sent-requests`)
      ]);

      dispatch(setFriends(friendsRes.data.friends));
      dispatch(setPendingRequests(pendingRes.data.pendingRequests));
      dispatch(setSentRequests(sentRes.data.sentRequests));
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  // Join user's room
  socket.emit('join', username);
  await fetchInitialData();

  // Set up real-time listeners
  socket.on('friends-update', async () => {
    const res = await axios.get(`${BASE_URL}/friends/${username}/friends`);
    dispatch(setFriends(res.data.friends));
  });

  socket.on('pending-requests-update', async () => {
    const res = await axios.get(`${BASE_URL}/friends/${username}/pending-requests`);
    dispatch(setPendingRequests(res.data.pendingRequests));
  });

  socket.on('sent-requests-update', async () => {
    const res = await axios.get(`${BASE_URL}/friends/${username}/sent-requests`);
    dispatch(setSentRequests(res.data.sentRequests));
  });

  // Cleanup function
  return () => {
    socket.off('friends-update');
    socket.off('pending-requests-update');
    socket.off('sent-requests-update');
    socket.emit('leave', username);
  };
};

export default friendsSlice.reducer; 