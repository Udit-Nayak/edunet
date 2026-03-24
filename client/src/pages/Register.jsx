import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { loginSuccess, setLoading } from '../redux/slices/authSlice';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoadingState] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/feed';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoadingState(true);
    dispatch(setLoading(true));

    try {
      const response = await authAPI.register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });

      dispatch(loginSuccess({
        user: response.data.user,
        token: response.data.token,
        needsProfileSetup: true,
      }));

      toast.success('Account created successfully!');
      navigate('/profile-setup');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoadingState(false);
      dispatch(setLoading(false));
    }
  };

  const handleGoogleSignIn = async () => {
    setLoadingState(true);
    dispatch(setLoading(true));

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseToken = await result.user.getIdToken();

      const response = await authAPI.googleAuth(firebaseToken);
      const isNewUser = response.data.isNewUser;

      dispatch(loginSuccess({
        user: response.data.user,
        token: response.data.token,
        needsProfileSetup: isNewUser,
      }));

      toast.success(isNewUser ? 'Account created with Google!' : 'Signed in with Google!');
      
      if (isNewUser) {
        navigate('/profile-setup');
      } else {
        navigate(from, { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Google sign-in failed');
    } finally {
      setLoadingState(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Split Screen (Hidden on Mobile) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-light via-[#EAF3FB] to-bg-secondary flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative Abstract Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary opacity-5 rounded-full blur-[80px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-orange opacity-5 rounded-full blur-[80px]"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center max-w-md"
        >
          <Link to="/" className="inline-flex items-center justify-center mb-8">
          <span className="font-sans font-bold text-accent-orange text-4xl tracking-tight">E</span>
            <span className="font-sans font-bold text-[#1D1D1D] text-4xl tracking-tight">dunet</span>
            
          </Link>
          <h2 className="text-3xl font-bold text-text-primary mb-4">Start your learning journey</h2>
          <p className="text-lg text-text-secondary leading-relaxed">
            Join thousands of students collaborating to build the best academic knowledge base in the world.
          </p>
        </motion.div>
      </div>

      {/* Right Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 overflow-y-auto">
        <div className="max-w-md w-full space-y-8 my-auto py-8">
          
          {/* Mobile Logo Only */}
          <div className="lg:hidden text-center mb-10">
            <Link to="/" className="inline-flex items-center justify-center">
            <span className="font-sans font-bold text-accent-orange text-3xl tracking-tight">E</span>
              <span className="font-sans font-bold text-[#1D1D1D] text-3xl tracking-tight">dunet</span>
              
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-text-primary">Create an account</h2>
            <p className="mt-2 text-sm text-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:text-primary-hover transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <Button
              variant="secondary"
              block
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-12"
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-text-tertiary">Or register with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="username" className="block text-sm font-semibold text-text-primary">
                    Username
                  </label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="johndoe"
                  />
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="email" className="block text-sm font-semibold text-text-primary">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="password" className="block text-sm font-semibold text-text-primary">
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-text-primary">
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                block
                disabled={loading}
                className="h-12 mt-4"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}