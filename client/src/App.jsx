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

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, needsProfileSetup } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (needsProfileSetup) {
    return <Navigate to="/profile-setup" replace />;
  }

  return children;
}

// Public Route Component (redirect if already authenticated)
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
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useAuth();

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          dispatch(setLoading(true));
          const response = await authAPI.getMe();
          
          // Check if profile needs setup
          const user = response.data.user;
          const needsSetup = !user.bio && !user.college && user.interests.length === 0;
          
          dispatch(loginSuccess({
            user: user,
            token: token,
            needsProfileSetup: needsSetup,
          }));
        } catch {
          dispatch(logout());
        } finally {
          dispatch(setLoading(false));
        }
      }
    };

    checkAuth();
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* Profile Setup Route */}
        <Route
          path="/profile-setup"
          element={
            isAuthenticated ? <ProfileSetup /> : <Navigate to="/login" replace />
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Edit Profile Route */}
        <Route
          path="/edit-profile"
          element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          }
        />

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