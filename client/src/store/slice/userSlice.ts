// store/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  username: string | null;
  isLoggedIn: boolean;
  // add other user properties you need
}

const initialState: UserState = {
  username: null,
  isLoggedIn: false
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ username: string }>) => {
      state.username = action.payload.username;
      state.isLoggedIn = true;
    },
    logout: (state) => {
      state.username = null;
      state.isLoggedIn = false;
    }
  }
});

export const { setUser, logout } = userSlice.actions;
export default userSlice.reducer;