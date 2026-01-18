import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { authAPI, postAPI } from '../services/api';
import Navbar from '../components/common/Navbar';
import PostCard from '../components/post/PostCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { FiCalendar, FiAward, FiTrendingUp } from 'react-icons/fi';
import { formatDate } from '../utils/formatters';

export default function UserProfile() {
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeTab]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user info by ID
      const userResponse = await authAPI.getUserById(userId);
      setUser(userResponse.data.user);

      // Fetch user's posts
      const params = {
        page: 1,
        limit: 20,
      };
      
      if (activeTab !== 'all') {
        params.type = activeTab;
      }

      const postsResponse = await postAPI.getUserPosts(userId, params);
      setPosts(postsResponse.data.posts);
      setError(null);
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePostDelete = (postId) => {
    setPosts(posts.filter(post => post._id !== postId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <LoadingSpinner size="lg" text="Loading profile..." />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <ErrorMessage message={error || 'User not found'} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <img
              src={user.avatar}
              alt={user.username}
              className="w-24 h-24 rounded-full"
            />

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{user.username}</h1>
              </div>

              {user.bio && (
                <p className="text-gray-600 mb-4">{user.bio}</p>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {user.college && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">College:</span>{' '}
                    <span className="text-gray-600">{user.college}</span>
                  </div>
                )}
                
                {user.yearOfStudy && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Year:</span>{' '}
                    <span className="text-gray-600">{user.yearOfStudy}</span>
                  </div>
                )}

                <div className="text-sm flex items-center space-x-2">
                  <FiCalendar className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    Joined {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>

              {/* Interests */}
              {user.interests && user.interests.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-gray-700">Interests:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <FiAward className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-xl font-bold text-primary-600">
                      {user.reputation || 0}
                    </p>
                    <p className="text-xs text-gray-600">Reputation</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <FiTrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xl font-bold text-gray-900">
                      {user.currentStreak || 0}
                    </p>
                    <p className="text-xs text-gray-600">Day Streak</p>
                  </div>
                </div>

                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {user.followersCount || 0}
                  </p>
                  <p className="text-xs text-gray-600">Followers</p>
                </div>

                <div>
                  <p className="text-xl font-bold text-gray-900">
                    {user.followingCount || 0}
                  </p>
                  <p className="text-xs text-gray-600">Following</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Posts</h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Posts
            </button>
            <button
              onClick={() => setActiveTab('question')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'question'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Questions
            </button>
            <button
              onClick={() => setActiveTab('note')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'note'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('article')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                activeTab === 'article'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Articles
            </button>
          </div>

          {/* Posts List */}
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-600">This user hasn't posted anything yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post._id} post={post} onDelete={handlePostDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}