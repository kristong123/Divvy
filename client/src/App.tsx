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

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isLoggedIn = useSelector((state: RootState) => state.user.isLoggedIn);
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const username = useSelector((state: RootState) => state.user.username);
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

  return (
    <>
      <Toaster position="top-center" />
      <BrowserRouter>
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
      </BrowserRouter>
    </>
  );
}

export default App;