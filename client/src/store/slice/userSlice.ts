// store/userSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface UserState {
  username: string;
  venmoUsername: string | null;
  profilePicture: string | null;
  isLoggedIn: boolean;
  isAuthenticated: boolean;
  // add other user properties you need
}

const initialState: UserState = {
  username: "",
  venmoUsername: null,
  profilePicture: null,
  isLoggedIn: false,
  isAuthenticated: false,
};

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
      state.profilePicture = action.payload.imageUrl;
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
});

export const {
  setUser,
  logout,
  updateProfilePicture,
  setVenmoUsername,
  forceProfileRefresh,
} = userSlice.actions;
export default userSlice.reducer;
