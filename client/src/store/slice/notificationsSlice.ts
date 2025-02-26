import { createSlice, PayloadAction, createAction, Middleware } from '@reduxjs/toolkit';
import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { BASE_URL } from '../../config/api';

// Create proper action creators for socket events
export const notificationMarkedRead = createAction<{id: string}>('notification-marked-read');
export const allNotificationsMarkedRead = createAction('all-notifications-marked-read');
export const allNotificationsCleared = createAction('all-notifications-cleared');

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  read: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0
};

export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter(n => !n.read).length;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      const notification = {
        ...action.payload,
        read: false
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      // Only mark as read if it's the last clicked notification
      const lastClickedId = window.localStorage.getItem('lastClickedNotificationId');
      
      if (lastClickedId === action.payload) {
        const notification = state.notifications.find(n => n.id === action.payload);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount -= 1;
        }
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach(n => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(notificationMarkedRead, (state, action) => {
        // Create a new array with only the specific notification updated
        state.notifications = state.notifications.map(notification => {
          if (notification.id === action.payload.id) {
            return { ...notification, read: true };
          }
          return notification;
        });
        
        // Recalculate unread count
        state.unreadCount = state.notifications.filter(n => !n.read).length;
      })
      .addCase(allNotificationsMarkedRead, (state) => {
        state.notifications.forEach(notification => {
          notification.read = true;
        });
        state.unreadCount = 0;
      })
      .addCase(allNotificationsCleared, (state) => {
        state.notifications = [];
        state.unreadCount = 0;
      });
  }
});

export const { 
  setNotifications, 
  addNotification, 
  markAsRead, 
  markAllAsRead, 
  clearNotifications 
} = notificationsSlice.actions;

export default notificationsSlice.reducer;

// Add this thunk to fetch notifications
export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (username: string) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/notifications/${username}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }
);

// Update the thunks to remove the unused dispatch parameter
export const markNotificationAsRead = createAsyncThunk(
  'notifications/markNotificationAsRead',
  async ({ username, notificationId }: { username: string, notificationId: string }) => {
    // Import the socket service function here to avoid circular dependencies
    const { markNotificationRead } = await import('../../services/socketService');
    markNotificationRead(username, notificationId);
    return notificationId;
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllNotificationsAsRead',
  async (username: string) => {
    // Import the socket service function here to avoid circular dependencies
    const { markAllNotificationsRead } = await import('../../services/socketService');
    markAllNotificationsRead(username);
    return;
  }
);

// Create a middleware to log all actions
export const loggerMiddleware: Middleware = () => next => action => {
  return next(action);
}; 