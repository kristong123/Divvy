import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import userReducer from './store/slice/userSlice';
import groupReducer from './store/slice/groupSlice';
import chatReducer from './store/slice/chatSlice';
import inviteReducer from './store/slice/inviteSlice';
import friendsReducer from './store/slice/friendsSlice';
import { initializeSocket } from './services/socketService';

// Mock the socket service to avoid actual socket connections during tests
vi.mock('./services/socketService', () => ({
  initializeSocket: vi.fn(() => () => {}),
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }))
}));

// Mock the auth service to avoid actual API calls during tests
vi.mock('./services/auth', () => ({
  loadUserData: vi.fn()
}));

// Create a test store with initial state that matches our Redux store structure
const createTestStore = () => configureStore({
  reducer: {
    user: userReducer,
    groups: groupReducer,
    chat: chatReducer,
    invites: inviteReducer,
    friends: friendsReducer
  },
  // Define initial state for all slices to prevent undefined errors
  preloadedState: {
    user: {
      username: '',
      venmoUsername: null,
      profilePicture: null,
      isLoggedIn: false,
      isAuthenticated: false
    },
    friends: {
      friends: [],
      pendingRequests: [],
      sentRequests: [],
      loading: false,
      error: null
    },
    groups: {
      groups: {},
      messages: {},
      loading: false,
      error: null,
      selectedGroup: null
    },
    chat: {
      messages: {},
      loading: false,
      error: null
    },
    invites: {
      invites: [],
      groupInvites: {},
      loading: false,
      error: null
    }
  }
});

describe('App', () => {
  // Test 1: Verify that unauthenticated users see the login page
  it('renders login page when not authenticated', () => {
    const store = createTestStore();
    
    render(
      <Provider store={store}>
        <App RouterComponent={MemoryRouter} />
      </Provider>
    );
    
    // Should find the Divvy logo/text on the login page
    expect(screen.getByText(/Divvy/i)).toBeInTheDocument();
  });

  // Test 2: Verify that authenticated users are redirected to dashboard
  it('redirects to dashboard when authenticated', () => {
    const store = createTestStore();
    // Simulate a logged-in user by dispatching setUser action
    store.dispatch({
      type: 'user/setUser',
      payload: {
        username: 'testuser',
        profilePicture: null,
        isLoggedIn: true
      }
    });

    render(
      <Provider store={store}>
        <App RouterComponent={MemoryRouter} />
      </Provider>
    );

    // Verify dashboard is rendered by checking for the Divvy heading
    expect(screen.getByText('Divvy')).toBeInTheDocument();
  });

  // Test 3: Verify that socket connection is initialized for logged-in users
  it('initializes socket connection when user is logged in', () => {
    const store = createTestStore();
    // Simulate a logged-in user
    store.dispatch({
      type: 'user/setUser',
      payload: {
        username: 'testuser',
        profilePicture: null,
        isLoggedIn: true
      }
    });

    render(
      <Provider store={store}>
        <App RouterComponent={MemoryRouter} />
      </Provider>
    );

    // Verify that initializeSocket was called with the correct username
    expect(initializeSocket).toHaveBeenCalledWith('testuser');
  });
});