// store/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  username: string;
  venmoUsername: string | null;
  profilePicture: string | null;
  isLoggedIn: boolean;
  // add other user properties you need
}

const initialState: UserState = {
  username: '',
  venmoUsername: null,
  profilePicture: null,
  isLoggedIn: false
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ 
        username: string; 
        profilePicture: string | null;
        venmoUsername?: string | null;
    }>) => {
      state.username = action.payload.username;
      state.profilePicture = action.payload.profilePicture;
      state.venmoUsername = action.payload.venmoUsername || null;
      state.isLoggedIn = true;
    },
    logout: (state) => {
      state.username = '';
      state.venmoUsername = null;
      state.profilePicture = null;
      state.isLoggedIn = false;
    },
    updateProfilePicture: (state, action: PayloadAction<string>) => {
      state.profilePicture = action.payload;
    },
    setVenmoUsername: (state, action: PayloadAction<string | null>) => {
      state.venmoUsername = action.payload;
    },
  }
});

export const { setUser, logout, updateProfilePicture, setVenmoUsername } = userSlice.actions;
export default userSlice.reducer;