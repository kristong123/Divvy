// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { RootState } from './store/store';
import Login from './components/Login';
import Main from './components/Main';
import { Toaster } from 'react-hot-toast';
import { initializeSocket } from './services/socketService';
import { loadUserData } from './services/auth';
import { checkAllGroupInvites } from './services/inviteService';

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isLoggedIn = useSelector((state: RootState) => state.user.isLoggedIn);
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

interface AppProps {
  RouterComponent?: typeof BrowserRouter;
}

function App({ RouterComponent = BrowserRouter }: AppProps) {
  const username = useSelector((state: RootState) => state.user.username);
  const isAuthenticated = useSelector((state: RootState) => state.user.isAuthenticated);
  const dispatch = useDispatch();

  useEffect(() => {
    if (username) {
      // Initialize socket
      const cleanup = initializeSocket(username);
      
      // Load user data including messages
      const loadInitialData = async () => {
        try {
          // This will load all messages for the user
          await loadUserData(username, dispatch);
        } catch (error) {
          console.error('Error loading initial data:', error);
        }
      };
      
      loadInitialData();
      
      return cleanup;
    }
  }, [username, dispatch]);

  // Check all group invites when user logs in
  useEffect(() => {
    if (isAuthenticated && username) {
      checkAllGroupInvites(username);
    }
  }, [isAuthenticated, username]);

  return (
    <>
      <Toaster position="top-center" />
      <RouterComponent>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Main/>
              </ProtectedRoute>
            } 
          />
          {/* Redirect root to dashboard or login */}
          <Route 
            path="/" 
            element={<Navigate to="/dashboard" replace />} 
          />
        </Routes>
      </RouterComponent>
    </>
  );
}

export default App;