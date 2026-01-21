// src/hooks/useTokenSync.js
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { logout } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';

/**
 * Hook to detect when token changes in another tab and force logout
 * This prevents session conflicts when multiple accounts are used in different tabs
 */
export const useTokenSync = () => {
  const dispatch = useDispatch();
  const currentTokenRef = useRef(localStorage.getItem('token'));

  useEffect(() => {
    const handleStorageChange = (e) => {
      // Only handle token changes
      if (e.key !== 'token') return;

      const newToken = e.newValue;
      const oldToken = currentTokenRef.current;

      // Case 1: Different user logged in from another tab
      if (newToken && oldToken && newToken !== oldToken) {
        console.log('⚠️ Different account logged in from another tab');
        
        toast.error(
          'Another account has been logged in from a different tab. Logging out...',
          { duration: 3000 }
        );

        // Update ref immediately to prevent loops
        currentTokenRef.current = null;

        // Clear current session without navigating
        dispatch(logout());
        
        // Force reload to reset app state
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
      
      // Case 2: Logged out from another tab
      else if (!newToken && oldToken) {
        console.log('⚠️ Logged out from another tab');
        
        toast.info('You have been logged out from another tab.', {
          duration: 3000,
        });

        // Update ref immediately to prevent loops
        currentTokenRef.current = null;

        // Clear current session
        dispatch(logout());
        
        // Force reload to reset app state
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
      
      // Case 3: Logged in from another tab (was not logged in before)
      else if (newToken && !oldToken) {
        console.log('✅ Logged in from another tab - reloading');
        
        toast.success('Login detected. Refreshing...', {
          duration: 2000,
        });
        
        // Update ref
        currentTokenRef.current = newToken;
        
        // Reload the page to pick up the new session
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    };

    // Listen for storage changes from other tabs
    // NOTE: This event only fires in OTHER tabs, not the current tab
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch]);
};