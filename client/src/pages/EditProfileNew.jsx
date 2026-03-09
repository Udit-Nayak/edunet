import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import { updateUser, setNeedsProfileSetup } from '../redux/slices/authSlice';
import Navbar from '../components/common/Navbar';
import AvatarUpload from '../components/common/AvatarUpload';
import { FiPlus, FiTrash2, FiSave, FiBriefcase, FiBookOpen, FiCode, FiAward, FiGlobe, FiMapPin, FiX } from 'react-icons/fi';

export default function EditProfile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: user?.username || '',
    bio: user?.bio || '',
    headline: user?.headline || '',
    college: user?.college || '',
    yearOfStudy: user?.yearOfStudy?.toString() || '',
    interests: user?.interests?.join(', ') || '',
    website: user?.website || '',
    avatar: user?.avatar || '',
    location: {
      city: user?.location?.city || '',
      state: user?.location?.state || '',
      country: user?.location?.country || ''
    },
    socialLinks: {
      linkedin: user?.socialLinks?.linkedin || '',
      github: user?.socialLinks?.github || '',
      twitter: user?.socialLinks?.twitter || '',
      portfolio: user?.socialLinks?.portfolio || ''
    },
    education: user?.education || [],
    experience: user?.experience || [],
    projects: user?.projects || [],
    skills: user?.skills || [],
    certifications: user?.certifications || [],
    languages: user?.languages || [],
    publications: user?.publications || []
  });

  // Update formData when user data changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        bio: user.bio || '',
        headline: user.headline || '',
        college: user.college || '',
        yearOfStudy: user.yearOfStudy?.toString() || '',
        interests: user.interests?.join(', ') || '',
        website: user.website || '',
        avatar: user.avatar || '',
        location: {
          city: user.location?.city || '',
          state: user.location?.state || '',
          country: user.location?.country || ''
        },
        socialLinks: {
          linkedin: user.socialLinks?.linkedin || '',
          github: user.socialLinks?.github || '',
          twitter: user.socialLinks?.twitter || '',
          portfolio: user.socialLinks?.portfolio || ''
        },
        education: user.education || [],
        experience: user.experience || [],
        projects: user.projects || [],
        skills: user.skills || [],
        certifications: user.certifications || [],
        languages: user.languages || [],
        publications: user.publications || []
      });
    }
  }, [user]);

  const handleBasicChange = (e) => {
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

  const addArrayItem = (arrayName, newItem) => {
    setFormData({
      ...formData,
      [arrayName]: [...formData[arrayName], newItem]
    });
  };

  const updateArrayItem = (arrayName, index, updatedItem) => {
    const updatedArray = [...formData[arrayName]];
    updatedArray[index] = updatedItem;
    setFormData({ ...formData, [arrayName]: updatedArray });
  };

  const removeArrayItem = (arrayName, index) => {
    setFormData({
      ...formData,
      [arrayName]: formData[arrayName].filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const usernameChanged = formData.username !== user.username;

      if (usernameChanged) {
        const usernameResponse = await authAPI.updateUsername(formData.username);
        dispatch(updateUser({ username: usernameResponse.data.user.username }));
      }

      const interestsArray = formData.interests
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item !== '');

      const profileData = {
        bio: formData.bio,
        headline: formData.headline,
        college: formData.college,
        yearOfStudy: parseInt(formData.yearOfStudy) || undefined,
        interests: interestsArray,
        website: formData.website,
        avatar: formData.avatar,
        location: formData.location,
        socialLinks: formData.socialLinks,
        education: formData.education,
        experience: formData.experience,
        projects: formData.projects,
        skills: formData.skills,
        certifications: formData.certifications,
        languages: formData.languages,
        publications: formData.publications
      };

      console.log('📤 Sending profile data:', profileData);

      const response = await authAPI.updateProfile(profileData);
      
      console.log('📥 Received response:', response.data);
      
      dispatch(updateUser(response.data.user));
      dispatch(setNeedsProfileSetup(false));

      toast.success('Profile updated successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FiMapPin },
    { id: 'education', label: 'Education', icon: FiBookOpen },
    { id: 'experience', label: 'Experience', icon: FiBriefcase },
    { id: 'projects', label: 'Projects', icon: FiCode },
    { id: 'skills', label: 'Skills & More', icon: FiAward }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Profile</h1>
          <p className="text-gray-600">Build your professional profile</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-max px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 bg-primary-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <BasicInfoSection formData={formData} handleChange={handleBasicChange} />
            </div>
          )}

          {/* Education Tab */}
          {activeTab === 'education' && (
            <EducationSection
              education={formData.education}
              add={(item) => addArrayItem('education', item)}
              update={(index, item) => updateArrayItem('education', index, item)}
              remove={(index) => removeArrayItem('education', index)}
            />
          )}

          {/* Experience Tab */}
          {activeTab === 'experience' && (
            <ExperienceSection
              experience={formData.experience}
              add={(item) => addArrayItem('experience', item)}
              update={(index, item) => updateArrayItem('experience', index, item)}
              remove={(index) => removeArrayItem('experience', index)}
            />
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <ProjectsSection
              projects={formData.projects}
              add={(item) => addArrayItem('projects', item)}
              update={(index, item) => updateArrayItem('projects', index, item)}
              remove={(index) => removeArrayItem('projects', index)}
            />
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <SkillsSection
              skills={formData.skills}
              certifications={formData.certifications}
              languages={formData.languages}
              addSkill={(item) => addArrayItem('skills', item)}
              removeSkill={(index) => removeArrayItem('skills', index)}
              addCert={(item) => addArrayItem('certifications', item)}
              updateCert={(index, item) => updateArrayItem('certifications', index, item)}
              removeCert={(index) => removeArrayItem('certifications', index)}
              addLang={(item) => addArrayItem('languages', item)}
              removeLang={(index) => removeArrayItem('languages', index)}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <Link to="/dashboard" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center space-x-2"
            >
              <FiSave className="w-5 h-5" />
              <span>{loading ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Basic Info Section Component
function BasicInfoSection({ formData, handleChange }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

      {/* Avatar Upload */}
      <div className="flex justify-center pb-6 border-b border-gray-200">
        <AvatarUpload
          currentAvatar={formData.avatar}
          onAvatarChange={(url) => handleChange({ target: { name: 'avatar', value: url } })}
          size="xl"
        />
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Username <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="input-field"
          required
        />
      </div>

      {/* Headline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Professional Headline
        </label>
        <input
          type="text"
          name="headline"
          value={formData.headline}
          onChange={handleChange}
          placeholder="e.g., Computer Science Student | Full Stack Developer"
          className="input-field"
          maxLength={120}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.headline.length}/120 characters</p>
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bio / About
        </label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleChange}
          rows={4}
          placeholder="Tell us about yourself..."
          className="input-field"
          maxLength={500}
        />
        <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500 characters</p>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            type="text"
            name="location.city"
            value={formData.location.city}
            onChange={handleChange}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
          <input
            type="text"
            name="location.state"
            value={formData.location.state}
            onChange={handleChange}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <input
            type="text"
            name="location.country"
            value={formData.location.country}
            onChange={handleChange}
            className="input-field"
          />
        </div>
      </div>

      {/* College & Year */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">College/University</label>
          <input
            type="text"
            name="college"
            value={formData.college}
            onChange={handleChange}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Year of Study</label>
          <select
            name="yearOfStudy"
            value={formData.yearOfStudy}
            onChange={handleChange}
            className="input-field"
          >
            <option value="">Select Year</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
            <option value="5">5th Year</option>
            <option value="6">6th Year</option>
          </select>
        </div>
      </div>

      {/* Interests */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Interests (comma-separated)
        </label>
        <input
          type="text"
          name="interests"
          value={formData.interests}
          onChange={handleChange}
          placeholder="e.g., Machine Learning, Web Development, Data Science"
          className="input-field"
        />
      </div>

      {/* Website */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
        <input
          type="url"
          name="website"
          value={formData.website}
          onChange={handleChange}
          placeholder="https://yourwebsite.com"
          className="input-field"
        />
      </div>

      {/* Social Links */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Social Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
            <input
              type="url"
              name="socialLinks.linkedin"
              value={formData.socialLinks.linkedin}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/username"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GitHub</label>
            <input
              type="url"
              name="socialLinks.github"
              value={formData.socialLinks.github}
              onChange={handleChange}
              placeholder="https://github.com/username"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Twitter</label>
            <input
              type="url"
              name="socialLinks.twitter"
              value={formData.socialLinks.twitter}
              onChange={handleChange}
              placeholder="https://twitter.com/username"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio</label>
            <input
              type="url"
              name="socialLinks.portfolio"
              value={formData.socialLinks.portfolio}
              onChange={handleChange}
              placeholder="https://portfolio.com"
              className="input-field"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Education Section Component  
function EducationSection({ education, add, update, remove }) {
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    currentlyStudying: false,
    grade: '',
    description: ''
  });

  const handleAddOrUpdate = () => {
    if (editIndex !== null) {
      update(editIndex, formData);
      setEditIndex(null);
    } else {
      add(formData);
    }
    resetForm();
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    setFormData(education[index]);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      currentlyStudying: false,
      grade: '',
      description: ''
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Education</h2>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Add Education</span>
          </button>
        </div>

        {showForm && (
          <div className="space-y-4 mb-6 p-4 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Institution <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                <input
                  type="text"
                  value={formData.degree}
                  onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  placeholder="e.g., Bachelor's, Master's"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Field of Study</label>
                <input
                  type="text"
                  value={formData.fieldOfStudy}
                  onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                  placeholder="e.g., Computer Science"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="month"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="month"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="input-field"
                  disabled={formData.currentlyStudying}
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.currentlyStudying}
                    onChange={(e) => setFormData({ ...formData, currentlyStudying: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Currently studying here</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade/GPA</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="e.g., 3.8/4.0"
                  className="input-field"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button type="button" onClick={handleAddOrUpdate} className="btn-primary">
                {editIndex !== null ? 'Update' : 'Add'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Education List */}
        <div className="space-y-4">
          {education.map((item, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.degree} {item.fieldOfStudy && `in ${item.fieldOfStudy}`}</h3>
                  <p className="text-gray-700">{item.institution}</p>
                  <p className="text-sm text-gray-500">
                    {item.startDate} - {item.currentlyStudying ? 'Present' : item.endDate || 'N/A'}
                  </p>
                  {item.grade && <p className="text-sm text-gray-600">Grade: {item.grade}</p>}
                  {item.description && <p className="text-sm text-gray-600 mt-2">{item.description}</p>}
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Experience Section Component  
function ExperienceSection({ experience, add, update, remove }) {
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    employmentType: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    description: ''
  });

  const handleAddOrUpdate = () => {
    if (editIndex !== null) {
      update(editIndex, formData);
      setEditIndex(null);
    } else {
      add(formData);
    }
    resetForm();
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    setFormData(experience[index]);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      company: '',
      location: '',
      employmentType: '',
      startDate: '',
      endDate: '',
      currentlyWorking: false,
      description: ''
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Work Experience</h2>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Add Experience</span>
          </button>
        </div>

        {showForm && (
          <div className="space-y-4 mb-6 p-4 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Software Engineer, Product Manager"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g., Google, Microsoft"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., San Francisco, CA"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select Type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="month"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="month"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="input-field"
                  disabled={formData.currentlyWorking}
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.currentlyWorking}
                    onChange={(e) => setFormData({ ...formData, currentlyWorking: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">I currently work here</span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Describe your responsibilities and achievements..."
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button type="button" onClick={handleAddOrUpdate} className="btn-primary">
                {editIndex !== null ? 'Update' : 'Add'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Experience List */}
        <div className="space-y-4">
          {experience.map((item, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-gray-700">{item.company}</p>
                  {item.location && <p className="text-sm text-gray-600">{item.location}</p>}
                  <p className="text-sm text-gray-500">
                    {item.startDate} - {item.currentlyWorking ? 'Present' : item.endDate || 'N/A'}
                    {item.employmentType && ` • ${item.employmentType}`}
                  </p>
                  {item.description && <p className="text-sm text-gray-600 mt-2">{item.description}</p>}
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Projects Section Component
function ProjectsSection({ projects, add, update, remove }) {
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    technologies: [],
    techInput: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    projectUrl: '',
    githubUrl: ''
  });

  const handleAddOrUpdate = () => {
    const projectData = {
      title: formData.title,
      description: formData.description,
      technologies: formData.technologies,
      startDate: formData.startDate,
      endDate: formData.endDate,
      currentlyWorking: formData.currentlyWorking,
      projectUrl: formData.projectUrl,
      githubUrl: formData.githubUrl
    };
    
    if (editIndex !== null) {
      update(editIndex, projectData);
      setEditIndex(null);
    } else {
      add(projectData);
    }
    resetForm();
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    const project = projects[index];
    setFormData({
      ...project,
      techInput: ''
    });
    setShowForm(true);
  };

  const addTechnology = () => {
    if (formData.techInput.trim()) {
      setFormData({
        ...formData,
        technologies: [...formData.technologies, formData.techInput.trim()],
        techInput: ''
      });
    }
  };

  const removeTechnology = (index) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter((_, i) => i !== index)
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      technologies: [],
      techInput: '',
      startDate: '',
      endDate: '',
      currentlyWorking: false,
      projectUrl: '',
      githubUrl: ''
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center space-x-2"
          >
            <FiPlus className="w-5 h-5" />
            <span>Add Project</span>
          </button>
        </div>

        {showForm && (
          <div className="space-y-4 mb-6 p-4 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., E-commerce Platform, ML Chatbot"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Describe your project..."
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Technologies</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formData.techInput}
                    onChange={(e) => setFormData({ ...formData, techInput: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTechnology())}
                    placeholder="e.g., React, Node.js, MongoDB"
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={addTechnology}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
                {formData.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.technologies.map((tech, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm flex items-center gap-2"
                      >
                        {tech}
                        <button
                          type="button"
                          onClick={() => removeTechnology(index)}
                          className="hover:text-primary-900"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="month"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="month"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="input-field"
                    disabled={formData.currentlyWorking}
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.currentlyWorking}
                    onChange={(e) => setFormData({ ...formData, currentlyWorking: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Currently working on this project</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Project URL</label>
                <input
                  type="url"
                  value={formData.projectUrl}
                  onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                  placeholder="https://project-demo.com"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">GitHub URL</label>
                <input
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({ ...formData, githubUrl: e.target.value })}
                  placeholder="https://github.com/username/repo"
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button type="button" onClick={handleAddOrUpdate} className="btn-primary">
                {editIndex !== null ? 'Update' : 'Add'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="space-y-4">
          {projects.map((item, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  {item.technologies && item.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.technologies.map((tech, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {item.startDate} - {item.currentlyWorking ? 'Present' : item.endDate || 'N/A'}
                  </p>
                  <div className="flex gap-3 mt-2">
                    {item.projectUrl && (
                      <a
                        href={item.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        View Project
                      </a>
                    )}
                    {item.githubUrl && (
                      <a
                        href={item.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        GitHub
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    type="button"
                    onClick={() => handleEdit(index)}
                    className="text-primary-600 hover:text-primary-800"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Skills Section Component
function SkillsSection({ skills, certifications, languages, addSkill, removeSkill, addCert, updateCert, removeCert, addLang, removeLang }) {
  const [activeSubTab, setActiveSubTab] = useState('skills');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills & More</h2>
        
        {/* Sub Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('skills')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeSubTab === 'skills'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Skills
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('certifications')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeSubTab === 'certifications'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Certifications
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('languages')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeSubTab === 'languages'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Languages
          </button>
        </div>

        {/* Skills Sub-section */}
        {activeSubTab === 'skills' && (
          <SkillsSubSection skills={skills} addSkill={addSkill} removeSkill={removeSkill} />
        )}

        {/* Certifications Sub-section */}
        {activeSubTab === 'certifications' && (
          <CertificationsSubSection 
            certifications={certifications} 
            addCert={addCert} 
            updateCert={updateCert}
            removeCert={removeCert} 
          />
        )}

        {/* Languages Sub-section */}
        {activeSubTab === 'languages' && (
          <LanguagesSubSection languages={languages} addLang={addLang} removeLang={removeLang} />
        )}
      </div>
    </div>
  );
}

// Skills Sub-section
function SkillsSubSection({ skills, addSkill, removeSkill }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    level: 'Intermediate'
  });

  const handleAddSkill = () => {
    addSkill({ ...formData, endorsements: 0 });
    setFormData({ name: '', level: 'Intermediate' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">Add your technical and professional skills</p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center space-x-2 text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Skill</span>
        </button>
      </div>

      {showForm && (
        <div className="p-4 border border-gray-200 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., JavaScript, Python, Leadership"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proficiency Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="input-field"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-2">
            <button type="button" onClick={handleAddSkill} className="btn-primary text-sm">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Skills List */}
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, index) => (
          <span
            key={index}
            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium flex items-center gap-2"
          >
            {skill.name} • {skill.level}
            <button
              type="button"
              onClick={() => removeSkill(index)}
              className="hover:text-blue-900"
            >
              <FiX className="w-4 h-4" />
            </button>
          </span>
        ))}
        {skills.length === 0 && (
          <p className="text-gray-500 text-sm">No skills added yet</p>
        )}
      </div>
    </div>
  );
}

// Certifications Sub-section
function CertificationsSubSection({ certifications, addCert, updateCert, removeCert }) {
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expirationDate: '',
    credentialId: '',
    credentialUrl: ''
  });

  const handleAddOrUpdate = () => {
    if (editIndex !== null) {
      updateCert(editIndex, formData);
      setEditIndex(null);
    } else {
      addCert(formData);
    }
    resetForm();
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    setFormData(certifications[index]);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      issuingOrganization: '',
      issueDate: '',
      expirationDate: '',
      credentialId: '',
      credentialUrl: ''
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">Add your professional certifications and licenses</p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center space-x-2 text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Certification</span>
        </button>
      </div>

      {showForm && (
        <div className="p-4 border border-gray-200 rounded-lg space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certification Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., AWS Certified Solutions Architect"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issuing Organization
              </label>
              <input
                type="text"
                value={formData.issuingOrganization}
                onChange={(e) => setFormData({ ...formData, issuingOrganization: e.target.value })}
                placeholder="e.g., Amazon Web Services"
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                <input
                  type="month"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiration Date</label>
                <input
                  type="month"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credential ID</label>
              <input
                type="text"
                value={formData.credentialId}
                onChange={(e) => setFormData({ ...formData, credentialId: e.target.value })}
                placeholder="Credential or License Number"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credential URL</label>
              <input
                type="url"
                value={formData.credentialUrl}
                onChange={(e) => setFormData({ ...formData, credentialUrl: e.target.value })}
                placeholder="https://credential-verification-url.com"
                className="input-field"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <button type="button" onClick={handleAddOrUpdate} className="btn-primary text-sm">
              {editIndex !== null ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Certifications List */}
      <div className="space-y-3">
        {certifications.map((cert, index) => (
          <div key={index} className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                {cert.issuingOrganization && (
                  <p className="text-sm text-gray-600">{cert.issuingOrganization}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {cert.issueDate && `Issued ${cert.issueDate}`}
                  {cert.expirationDate && ` • Expires ${cert.expirationDate}`}
                </p>
                {cert.credentialId && (
                  <p className="text-xs text-gray-500">ID: {cert.credentialId}</p>
                )}
                {cert.credentialUrl && (
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
                  >
                    View Credential
                  </a>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleEdit(index)}
                  className="text-primary-600 hover:text-primary-800 text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeCert(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {certifications.length === 0 && (
          <p className="text-gray-500 text-sm">No certifications added yet</p>
        )}
      </div>
    </div>
  );
}

// Languages Sub-section
function LanguagesSubSection({ languages, addLang, removeLang }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    proficiency: 'Professional'
  });

  const handleAddLanguage = () => {
    addLang(formData);
    setFormData({ name: '', proficiency: 'Professional' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-600">Add languages you speak</p>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center space-x-2 text-sm"
        >
          <FiPlus className="w-4 h-4" />
          <span>Add Language</span>
        </button>
      </div>

      {showForm && (
        <div className="p-4 border border-gray-200 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., English, Spanish, Mandarin"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Proficiency</label>
              <select
                value={formData.proficiency}
                onChange={(e) => setFormData({ ...formData, proficiency: e.target.value })}
                className="input-field"
              >
                <option value="Elementary">Elementary</option>
                <option value="Limited Working">Limited Working</option>
                <option value="Professional">Professional</option>
                <option value="Full Professional">Full Professional</option>
                <option value="Native">Native or Bilingual</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-2">
            <button type="button" onClick={handleAddLanguage} className="btn-primary text-sm">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Languages List */}
      <div className="space-y-2">
        {languages.map((lang, index) => (
          <div key={index} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
            <div>
              <span className="font-medium text-gray-900">{lang.name}</span>
              <span className="text-sm text-gray-600 ml-2">• {lang.proficiency}</span>
            </div>
            <button
              type="button"
              onClick={() => removeLang(index)}
              className="text-red-600 hover:text-red-800"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {languages.length === 0 && (
          <p className="text-gray-500 text-sm">No languages added yet</p>
        )}
      </div>
    </div>
  );
}
