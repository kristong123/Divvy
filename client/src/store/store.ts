// store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./slice/userSlice";
import chatReducer from "./slice/chatSlice";
import friendsReducer from "./slice/friendsSlice";
import groupReducer from "./slice/groupSlice";
import notificationsReducer from "./slice/notificationsSlice";
import { loggerMiddleware } from "./middleware/loggerMiddleware";

export const store = configureStore({
  reducer: {
    user: userReducer,
    chat: chatReducer,
    friends: friendsReducer,
    groups: groupReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(loggerMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
