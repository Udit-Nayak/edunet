import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './redux/store';
import { useAuth } from './hooks/useAuth';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { authAPI } from './services/api';
import { loginSuccess, logout, setLoading } from './redux/slices/authSlice';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import EditProfile from './pages/EditProfile';
import Feed from './pages/Feed';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import PostDetail from './pages/PostDetail';

// Protected Route Component
function ProtectedRoute({ children, skipProfileCheck = false }) {
  const { isAuthenticated, loading, needsProfileSetup } = useAuth();

  console.log('ProtectedRoute:', { isAuthenticated, loading, needsProfileSetup, skipProfileCheck });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Skip profile setup check if this is the profile setup page itself
  if (!skipProfileCheck && needsProfileSetup) {
    console.log('Needs profile setup, redirecting to profile-setup');
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
}

// Public Route Component
function PublicRoute({ children }) {
  const { isAuthenticated, loading, needsProfileSetup } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isAuthenticated && needsProfileSetup) {
    return <Navigate to="/profile-setup" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  return children;
}

function AppContent() {
  const dispatch = useDispatch();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      console.log('checkAuth - token:', token ? 'exists' : 'none');
      
      if (token) {
        try {
          dispatch(setLoading(true));
          const response = await authAPI.getMe();
          console.log('getMe response:', response.data);
          
          const user = response.data.user;
          const needsSetup = !user.bio && !user.college && user.interests.length === 0;
          
          console.log('User loaded:', user.username, 'needsSetup:', needsSetup);
          
          dispatch(loginSuccess({
            user: user,
            token: token,
            needsProfileSetup: needsSetup,
          }));
        } catch (error) {
          console.error('Auth check failed:', error);
          dispatch(logout());
        } finally {
          dispatch(setLoading(false));
        }
      } else {
        dispatch(setLoading(false));
      }
    };

    checkAuth();
  }, [dispatch]);

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
        <Route path="/create-post" element={<ProtectedRoute><CreatePost /></ProtectedRoute>} />
        <Route path="/post/:id/edit" element={<ProtectedRoute><EditPost /></ProtectedRoute>} />
        <Route path="/post/:id" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppContent />
      <Toaster position="top-right" />
    </Provider>
  );
}

export default App;