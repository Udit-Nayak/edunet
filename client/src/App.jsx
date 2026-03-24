import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './redux/store';
import { useAuth } from './hooks/useAuth';
import { authAPI } from './services/api';
import { loginSuccess, logout, setLoading } from './redux/slices/authSlice';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import EditProfile from './pages/EditProfileNew';
import Feed from './pages/Feed';
import PersonalizedFeed from './pages/PersonalizedFeed';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import PostDetail from './pages/PostDetail';
import UserProfile from './pages/UserProfile';
import Search from './pages/Search';
import Subject from './pages/Subject';
import Tag from './pages/Tag';
import Settings from './pages/Settings';
import SavedPosts from './pages/SavedPosts';

// Loading Component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    </div>
  );
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops! Something went wrong</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Clear Cache & Restart
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Protected Route Component
function ProtectedRoute({ children, skipProfileCheck = false }) {
  const { isAuthenticated, loading, needsProfileSetup } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Save the current location so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!skipProfileCheck && needsProfileSetup) {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
}

// Public Route Component
function PublicRoute({ children }) {
  const { isAuthenticated, loading, needsProfileSetup } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated && needsProfileSetup) {
    return <Navigate to="/profile-setup" replace />;
  }

  if (isAuthenticated) {
    // Redirect to the page they were trying to access, or /feed if none
    const from = location.state?.from?.pathname || '/feed';
    return <Navigate to={from} replace />;
  }

  return children;
}

function AppContent() {
  const dispatch = useDispatch();
  const [initError, setInitError] = useState(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          dispatch(setLoading(true));
          
          const response = await authAPI.getMe();
          
          const user = response.data.user;
          const needsSetup = !user.bio && !user.college && user.interests.length === 0;
          
          dispatch(loginSuccess({
            user: user,
            token: token,
            needsProfileSetup: needsSetup,
          }));
        } catch (error) {
          // Clear invalid token
          localStorage.removeItem('token');
          dispatch(logout());
          
          // Show user-friendly error
          if (error.response?.status === 401) {
            // Session expired - redirect to login
          } else if (!error.response) {
            setInitError('Cannot connect to server. Please make sure the backend is running on http://localhost:5000');
          }
        } finally {
          dispatch(setLoading(false));
        }
      } else {
        dispatch(setLoading(false));
      }
    };

    checkAuth();
  }, [dispatch]);

  // Show initialization error
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-lg border-2 border-red-200">
          <div className="text-red-500 text-6xl mb-4">🔌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connection Error</h1>
          <p className="text-gray-600 mb-6">{initError}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                setInitError(null);
                dispatch(setLoading(false));
              }}
              className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Profile Setup - Special route that skips profile check */}
        <Route 
          path="/profile-setup" 
          element={
            <ProtectedRoute skipProfileCheck={true}>
              <ProfileSetup />
            </ProtectedRoute>
          } 
        />

        {/* Protected Routes */}
        <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/personalized" element={<ProtectedRoute><PersonalizedFeed /></ProtectedRoute>} />
        <Route path="/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/post/:id/edit" element={<ProtectedRoute><EditPost /></ProtectedRoute>} />
        <Route path="/post/:id" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
        <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute skipProfileCheck={true}><EditProfile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute><Navigate to="/search" replace /></ProtectedRoute>} />
        <Route path="/subject/:subject" element={<ProtectedRoute><Subject /></ProtectedRoute>} />
        <Route path="/tag/:tag" element={<ProtectedRoute><Tag /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><SavedPosts /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AppContent />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </Provider>
    </ErrorBoundary>
  );
}

export default App;