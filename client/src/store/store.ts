// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slice/userSlice';
import friendsReducer from './slice/friendsSlice';
import chatReducer from './slice/chatSlice';
import groupReducer from './slice/groupSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    friends: friendsReducer,
    chat: chatReducer,
    groups: groupReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;