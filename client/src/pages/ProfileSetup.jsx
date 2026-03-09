import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import { authAPI } from '../services/api';
import { updateUser, setNeedsProfileSetup } from "../redux/slices/authSlice";
import AvatarUpload from "../components/common/AvatarUpload";

export default function ProfileSetup() {
  const { user, loading, isAuthenticated } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // DEBUG: Log everything
  console.log('=== ProfileSetup Render ===');
  console.log('user:', user);
  console.log('loading:', loading);
  console.log('isAuthenticated:', isAuthenticated);
  console.log('=========================');
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: "",
    headline: "",
    college: "",
    yearOfStudy: "",
    interests: "",
    location: {
      city: "",
      state: "",
      country: ""
    },
    website: "",
    avatar: user?.avatar || ""
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: { ...formData[parent], [child]: value }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSkip = () => {
    dispatch(setNeedsProfileSetup(false));
    navigate("/feed");
  };

  const handleCreateAccount = async () => {
    // Same as submit but goes to feed instead of dashboard
    if (!user) {
      toast.error('User not found. Please login again.');
      return;
    }

    setSubmitting(true);

    try {
      const usernameChanged = formData.username !== user.username;

      if (usernameChanged && formData.username.trim()) {
        const usernameResponse = await authAPI.updateUsername(formData.username);
        dispatch(updateUser({ username: usernameResponse.data.user.username }));
      }

      const interestsArray = formData.interests
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");

      const profileData = {
        bio: formData.bio,
        headline: formData.headline,
        college: formData.college,
        yearOfStudy: parseInt(formData.yearOfStudy) || undefined,
        interests: interestsArray,
        location: formData.location,
        website: formData.website,
        avatar: formData.avatar
      };

      await authAPI.updateProfile(profileData);
      dispatch(updateUser(profileData));
      dispatch(setNeedsProfileSetup(false));

      toast.success('Profile created successfully!');
      navigate('/feed');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading
  if (loading) {
    console.log('Showing loading screen');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if no user
  if (!user) {
    console.log('No user found - showing error');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No User Data</h2>
          <p className="text-gray-600 mb-4">Unable to load user information.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  console.log('Rendering main form');

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user.username}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Let's set up your profile to get started
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-6">{/* Removed form tag */}
            {/* Avatar Upload */}
            <div className="flex justify-center pb-6 border-b border-gray-200">
              <AvatarUpload
                currentAvatar={formData.avatar}
                onAvatarChange={(url) => setFormData({ ...formData, avatar: url })}
                size="xl"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                name="bio"
                rows="3"
                value={formData.bio}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional Headline
              </label>
              <input
                name="headline"
                type="text"
                value={formData.headline}
                onChange={handleChange}
                maxLength={120}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Computer Science Student | Full Stack Developer"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.headline.length}/120 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  name="location.city"
                  type="text"
                  value={formData.location.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="City"
                />
                <input
                  name="location.state"
                  type="text"
                  value={formData.location.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="State"
                />
                <input
                  name="location.country"
                  type="text"
                  value={formData.location.country}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Country"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                College/University
              </label>
              <input
                name="college"
                type="text"
                value={formData.college}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="MIT, Stanford, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year of Study
              </label>
              <select
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year</option>
                <option value="6">6th Year+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interests (comma separated)
              </label>
              <input
                name="interests"
                type="text"
                value={formData.interests}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Python, AI, Web Dev"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Website (optional)
              </label>
              <input
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleCreateAccount}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-primary-600 text-black rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {submitting ? "Creating..." : "Create Account"}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                Skip for now
              </button>
            </div>
          </div>{/* Removed closing form tag */}
        </div>
      </div>
    </div>
  );
}