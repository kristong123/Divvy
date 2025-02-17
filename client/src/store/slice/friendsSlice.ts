import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import io from 'socket.io-client';
import { BASE_URL, SOCKET_URL } from '../../config/api';

const socket = io(SOCKET_URL);

interface PendingRequest {
  sender: string;
  createdAt: string;
  profilePicture?: string | null;
}

interface SentRequest {
  recipient: string;
  createdAt: string;
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
    return response.data;
  }
);

export const fetchSentRequests = createAsyncThunk(
  'friends/fetchSentRequests',
  async (username: string) => {
    const response = await axios.get(`${BASE_URL}/api/friends/sent/${username}`);
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
      recipient: user2, 
      status: 'pending', 
      message: response.data.message,
      profilePicture: response.data.profilePicture
    };
  }
);

export const acceptFriendRequest = createAsyncThunk(
  'friends/acceptRequest',
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.post(`${BASE_URL}/api/friends/accept`, {
      user1,
      user2,
    });
    return { 
      sender: user1, 
      message: response.data.message,
      profilePicture: response.data.profilePicture 
    };
  }
);

export const declineFriendRequest = createAsyncThunk(
  'friends/declineRequest',
  async ({ user1, user2 }: { user1: string; user2: string }) => {
    const response = await axios.post(`${BASE_URL}/api/friends/decline`, {
      user1,
      user2,
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
          profilePicture: action.payload.profilePicture
        });
      })
      // Accept Friend Request
      .addCase(acceptFriendRequest.fulfilled, (state, action) => {
        state.pendingRequests = state.pendingRequests.filter(
          (request) => request.sender !== action.payload.sender
        );
        state.friends.push({
          username: action.payload.sender,
          profilePicture: action.payload.profilePicture
        });
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

  // Join user's room
  socket.emit('join', username);
  await fetchInitialData();

  // Set up real-time listeners
  socket.on('friends-update', async () => {
    const res = await axios.get(`${BASE_URL}/api/friends/${username}`);
    dispatch(setFriends(res.data));
  });

  socket.on('pending-requests-update', async () => {
    const res = await axios.get(`${BASE_URL}/api/friends/requests/${username}`);
    dispatch(setPendingRequests(res.data.pendingRequests));
  });

  socket.on('sent-requests-update', async () => {
    const res = await axios.get(`${BASE_URL}/api/friends/sent/${username}`);
    dispatch(setSentRequests(res.data));
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