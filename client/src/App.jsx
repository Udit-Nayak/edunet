import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { store } from './redux/store';
import { useAuth } from './hooks/useAuth';
import { authAPI } from './services/api';
import { loginSuccess, logout, setLoading } from './redux/slices/authSlice';

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

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-secondary">
      <div className="text-center">
        <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-border border-t-primary"></div>
        <p className="text-lg font-medium text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}

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
        <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
          <div className="max-w-md rounded-lg border border-border bg-white p-8 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-red/10 text-accent-red">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="mb-4 text-2xl font-bold text-text-primary">Oops! Something went wrong</h1>
            <p className="mb-4 text-text-secondary">{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-hover"
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

function ProtectedRoute({ children, skipProfileCheck = false }) {
  const { isAuthenticated, loading, needsProfileSetup } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!skipProfileCheck && needsProfileSetup) {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
}

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
    const from = location.state?.from?.pathname || '/feed';
    return <Navigate to={from} replace />;
  }

  return children;
}

function AppContent() {
  const dispatch = useDispatch();
  const [initError, setInitError] = useState(null);

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
            user,
            token,
            needsProfileSetup: needsSetup,
          }));
        } catch (error) {
          localStorage.removeItem('token');
          dispatch(logout());

          if (!error.response) {
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

  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-secondary px-4">
        <div className="max-w-md rounded-lg border border-accent-red/20 bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-red/10 text-accent-red">
            <WifiOff className="h-7 w-7" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-text-primary">Connection Error</h1>
          <p className="mb-6 text-text-secondary">{initError}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                setInitError(null);
                dispatch(setLoading(false));
              }}
              className="w-full rounded-lg border border-border bg-bg-secondary px-6 py-3 font-semibold text-text-secondary transition-colors hover:bg-border-light hover:text-text-primary"
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
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute skipProfileCheck>
              <ProfileSetup />
            </ProtectedRoute>
          }
        />

        <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/personalized" element={<ProtectedRoute><PersonalizedFeed /></ProtectedRoute>} />
        <Route path="/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/post/:id/edit" element={<ProtectedRoute><EditPost /></ProtectedRoute>} />
        <Route path="/post/:id" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
        <Route path="/user/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute skipProfileCheck><EditProfile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/subjects" element={<ProtectedRoute><Navigate to="/search" replace /></ProtectedRoute>} />
        <Route path="/subject/:subject" element={<ProtectedRoute><Subject /></ProtectedRoute>} />
        <Route path="/tag/:tag" element={<ProtectedRoute><Tag /></ProtectedRoute>} />
        <Route path="/saved" element={<ProtectedRoute><SavedPosts /></ProtectedRoute>} />

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
