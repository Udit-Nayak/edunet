import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import { authAPI } from '../services/api';
import { updateUser, setNeedsProfileSetup } from "../redux/slices/authSlice";
import AvatarUpload from "../components/common/AvatarUpload";
import { Button } from "../components/ui/Button";
import { Input, Textarea } from "../components/ui/Input";

export default function ProfileSetup() {
  const { user, loading } = useAuth();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
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
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center p-8 bg-bg-secondary rounded-xl shadow-card border border-border max-w-sm w-full mx-4">
          <h2 className="text-2xl font-bold text-text-primary mb-4">No User Data</h2>
          <p className="text-text-secondary mb-6 font-medium">Unable to load user information.</p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-bg-primary py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Welcome, {user.username}! 👋
          </h1>
          <p className="mt-3 text-[16px] text-text-secondary font-medium">
            Let's set up your profile to get started
          </p>
        </div>

        <div className="bg-bg-secondary rounded-2xl shadow-card border border-border p-6 sm:p-10">
          <div className="space-y-8">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center justify-center pb-8 border-b border-border">
              <AvatarUpload
                currentAvatar={formData.avatar}
                onAvatarChange={(url) => setFormData({ ...formData, avatar: url })}
                size="xl"
              />
              <p className="text-[13px] text-text-tertiary font-medium mt-4">Upload a profile picture to stand out.</p>
            </div>

            <div className="space-y-6">
              <Textarea
                name="bio"
                label="Bio"
                rows="3"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
              />

              <div>
                <Input
                  name="headline"
                  label="Professional Headline"
                  type="text"
                  value={formData.headline}
                  onChange={handleChange}
                  maxLength={120}
                  placeholder="e.g., Computer Science Student | Full Stack Developer"
                />
                <p className="text-[12px] text-text-tertiary font-medium mt-1.5 text-right">{formData.headline.length}/120 characters</p>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-text-primary mb-2">
                  Location
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    name="location.city"
                    type="text"
                    value={formData.location.city}
                    onChange={handleChange}
                    placeholder="City"
                  />
                  <Input
                    name="location.state"
                    type="text"
                    value={formData.location.state}
                    onChange={handleChange}
                    placeholder="State"
                  />
                  <Input
                    name="location.country"
                    type="text"
                    value={formData.location.country}
                    onChange={handleChange}
                    placeholder="Country"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-text-primary mb-2">
                  Education Profile
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="college"
                    type="text"
                    value={formData.college}
                    onChange={handleChange}
                    placeholder="College/University (e.g., MIT, Stanford)"
                  />
                  <select
                    name="yearOfStudy"
                    value={formData.yearOfStudy}
                    onChange={handleChange}
                    className="w-full px-4 py-[13px] bg-bg-primary text-text-primary text-[15px] font-medium border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all duration-200 placeholder:text-text-tertiary"
                  >
                    <option value="">Select year of study</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                    <option value="5">5th Year</option>
                    <option value="6">6th Year+</option>
                  </select>
                </div>
              </div>

              <Input
                name="interests"
                label="Interests (comma separated)"
                type="text"
                value={formData.interests}
                onChange={handleChange}
                placeholder="Python, AI, Web Dev"
              />

              <Input
                name="website"
                label="Website (optional)"
                type="url"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
              <Button
                type="button"
                onClick={handleCreateAccount}
                disabled={submitting}
                className="flex-1 sm:order-2"
                size="lg"
              >
                {submitting ? "Creating..." : "Create Account"}
              </Button>
              <Button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                variant="secondary"
                className="sm:order-1"
                size="lg"
              >
                Skip for now
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}