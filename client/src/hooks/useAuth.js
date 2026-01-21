import { useSelector } from 'react-redux';

export const useAuth = () => {
  const { user, token, isAuthenticated, loading, needsProfileSetup } = useSelector(
    (state) => state.auth
  );

  return {
    user,
    token,
    isAuthenticated,
    loading,
    needsProfileSetup,
  };
};