// client/src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import { RootState } from './store/store';
import Login from './components/Login';
import Main from './components/Main';
import { Toaster } from 'react-hot-toast';
import { initializeSocket } from './services/socketService';

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

  useEffect(() => {
    if (username) {
      const cleanup = initializeSocket(username);
      return cleanup;
    }
  }, [username]);

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