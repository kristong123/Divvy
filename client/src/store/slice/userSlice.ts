// store/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  username: string | null;
  profilePicture: string | null;
  isLoggedIn: boolean;
  // add other user properties you need
}

const initialState: UserState = {
  username: null,
  profilePicture: null,
  isLoggedIn: false
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ username: string, profilePicture: string | null }>) => {
      state.username = action.payload.username;
      state.profilePicture = action.payload.profilePicture;
      state.isLoggedIn = true;
    },
    logout: (state) => {
      state.username = null;
      state.profilePicture = null;
      state.isLoggedIn = false;
    },
    updateProfilePicture: (state, action: PayloadAction<string>) => {
      state.profilePicture = action.payload;
    }
  }
});

export const { setUser, logout, updateProfilePicture } = userSlice.actions;
export default userSlice.reducer;