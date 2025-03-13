// store/userSlice.ts
import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { BASE_URL } from "../../config/api";

interface UserState {
  username: string;
  venmoUsername: string | null;
  profilePicture: string | null;
  isLoggedIn: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  username: "",
  venmoUsername: null,
  profilePicture: null,
  isLoggedIn: false,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// AsyncThunk for user login
export const loginUser = createAsyncThunk(
  "user/login",
  async ({ username, password }: { username: string; password: string }) => {
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
      
      const userData = {
        username: response.data.username,
        profilePicture: profilePictureWithTimestamp,
        venmoUsername: response.data.venmoUsername || null,
        token: response.data.token || '',
      };

      // Initialize socket connection - do this in the auth service instead
      // Dynamically import to avoid circular dependency
      const { initializeSocket } = await import("../../services/socketService");
      initializeSocket(userData.username);

      console.log(`✅ Authentication successful for: ${username}`);
      
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
  }
);

// AsyncThunk for fetching user details
export const fetchUserDetails = createAsyncThunk(
  "user/fetchDetails",
  async (username: string) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/users/${username}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user data for ${username}:`, error);
      throw error;
    }
  }
);

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (
      state,
      action: PayloadAction<{
        username: string;
        profilePicture: string | null;
        venmoUsername?: string | null;
      }>
    ) => {
      state.username = action.payload.username;
      state.profilePicture = action.payload.profilePicture;
      state.venmoUsername = action.payload.venmoUsername || null;
      state.isLoggedIn = true;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.username = "";
      state.venmoUsername = null;
      state.profilePicture = null;
      state.isLoggedIn = false;
      state.isAuthenticated = false;
    },
    updateProfilePicture: (
      state,
      action: PayloadAction<{ 
        username: string; 
        imageUrl: string;
        profilePicturePath?: string;
      }>
    ) => {
      // Only update the profile picture if the username matches the current user
      if (action.payload.username === state.username) {
        state.profilePicture = action.payload.imageUrl;
      }
    },
    setVenmoUsername: (state, action: PayloadAction<string | null>) => {
      state.venmoUsername = action.payload;
    },
    forceProfileRefresh: (state) => {
      if (state.profilePicture) {
        state.profilePicture = state.profilePicture.includes("?")
          ? state.profilePicture.split("?")[0] + "?t=" + Date.now()
          : state.profilePicture + "?t=" + Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login user
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.username = action.payload.username;
        state.profilePicture = action.payload.profilePicture;
        state.venmoUsername = action.payload.venmoUsername;
        state.isLoggedIn = true;
        state.isAuthenticated = true;
        state.loading = false;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Login failed";
      })
      // Fetch user details
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        // Update only the fields that are returned from the API
        if (action.payload.venmoUsername !== undefined) {
          state.venmoUsername = action.payload.venmoUsername;
        }
        if (action.payload.profilePicture !== undefined) {
          state.profilePicture = action.payload.profilePicture;
        }
      });
  },
});

export const {
  setUser,
  logout,
  updateProfilePicture,
  setVenmoUsername,
  forceProfileRefresh,
} = userSlice.actions;
export default userSlice.reducer;
