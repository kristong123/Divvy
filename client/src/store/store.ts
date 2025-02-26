// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slice/userSlice';
import chatReducer from './slice/chatSlice';
import friendsReducer from './slice/friendsSlice';
import groupReducer from './slice/groupSlice';
import inviteReducer from './slice/inviteSlice';
import inviteStatusReducer from './slice/inviteStatusSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    chat: chatReducer,
    friends: friendsReducer,
    groups: groupReducer,
    invites: inviteReducer,
    inviteStatus: inviteStatusReducer
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;