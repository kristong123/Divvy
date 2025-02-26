// store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slice/userSlice';
import chatReducer from './slice/chatSlice';
import friendsReducer from './slice/friendsSlice';
import groupReducer from './slice/groupSlice';
import inviteReducer from './slice/inviteSlice';
import inviteStatusReducer from './slice/inviteStatusSlice';
import notificationsReducer from './slice/notificationsSlice';
import { loggerMiddleware } from './slice/notificationsSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    chat: chatReducer,
    friends: friendsReducer,
    groups: groupReducer,
    invites: inviteReducer,
    inviteStatus: inviteStatusReducer,
    notifications: notificationsReducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false
    }).concat(loggerMiddleware)
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;