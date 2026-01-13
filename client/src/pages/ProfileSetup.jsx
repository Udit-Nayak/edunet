import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import { authAPI } from '../services/api';
import { updateUser, setNeedsProfileSetup } from "../redux/slices/authSlice";

export default function ProfileSetup() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: "",
    college: "",
    yearOfStudy: "",
    interests: "",
  });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const usernameChanged = formData.username !== user.username;

      // Update username if changed
      if (usernameChanged) {
        const usernameResponse = await authAPI.updateUsername(formData.username);
        dispatch(updateUser({ username: usernameResponse.data.user.username }));
      }

      // Convert interests string to array
      const interestsArray = formData.interests
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");

      const profileData = {
        bio: formData.bio,
        college: formData.college,
        yearOfStudy: parseInt(formData.yearOfStudy) || undefined,
        interests: interestsArray,
      };

      // Update user profile
      await authAPI.updateProfile(profileData);
      dispatch(updateUser(profileData));
      dispatch(setNeedsProfileSetup(false));

      toast.success('Profile setup complete!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    dispatch(setNeedsProfileSetup(false));
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.username}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Let's set up your profile to get started
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bio */}
            <div>
              <label
                htmlFor="bio"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Bio
                <span className="text-gray-400 text-xs ml-2">
                  Tell us about yourself
                </span>
              </label>
              <textarea
                id="bio"
                name="bio"
                rows="3"
                value={formData.bio}
                onChange={handleChange}
                className="input-field resize-none"
                placeholder="I'm a computer science student passionate about..."
              />
            </div>

            {/* College */}
            <div>
              <label
                htmlFor="college"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                College/University
              </label>
              <input
                id="college"
                name="college"
                type="text"
                value={formData.college}
                onChange={handleChange}
                className="input-field"
                placeholder="MIT, Stanford, IIT Delhi, etc."
              />
            </div>

            {/* Year of Study */}
            <div>
              <label
                htmlFor="yearOfStudy"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Year of Study
              </label>
              <select
                id="yearOfStudy"
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={handleChange}
                className="input-field"
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

            {/* Interests */}
            <div>
              <label
                htmlFor="interests"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Interests/Topics
                <span className="text-gray-400 text-xs ml-2">
                  Comma separated (e.g., Python, AI, Web Dev)
                </span>
              </label>
              <input
                id="interests"
                name="interests"
                type="text"
                value={formData.interests}
                onChange={handleChange}
                className="input-field"
                placeholder="Python, Machine Learning, Web Development, Data Structures"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-primary"
              >
                {loading ? "Saving..." : "Complete Profile"}
              </button>
              <button
                type="button"
                onClick={handleSkip}
                className="btn-secondary"
              >
                Skip for now
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}