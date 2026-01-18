import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { postAPI } from "../services/api";
import Navbar from "../components/common/Navbar";
import PostCard from "../components/post/PostCard";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function Dashboard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // all, question, note, article

  useEffect(() => {
    if (user?._id) {
      fetchUserPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const fetchUserPosts = async () => {
    try {
      setLoading(true);
          console.log('📊 Active Tab:', activeTab);
    console.log('👤 Current User:', user?.username, user?._id);

      if (activeTab === 'saved') {
      // Fetch saved posts for the CURRENT logged-in user
      console.log('📚 Fetching saved posts...');
      const response = await postAPI.getSavedPosts({
        page: 1,
        limit: 20,
      });
      console.log('✅ Saved posts response:', response.data);
      setPosts(response.data.posts);
    } else {
      // Fetch posts created by the user
      console.log('📝 Fetching user posts...');
      const params = {
        page: 1,
        limit: 20,
      };
      
      if (activeTab !== 'all') {
        params.type = activeTab;
      }

      const response = await postAPI.getUserPosts(user._id, params);
      console.log('✅ User posts response:', response.data);
      setPosts(response.data.posts);
    }
  } catch (error) {
    console.error('❌ Failed to fetch posts:', error);
  } finally {
    setLoading(false);
  }
  };

  const handlePostDelete = (postId) => {
    setPosts(posts.filter((post) => post._id !== postId));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Use the common Navbar component */}
      <Navbar />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Hello, {user?.username}! 👋
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Welcome to your dashboard
          </p>

          {/* User Info Card */}
          <div className="card max-w-2xl mx-auto text-left">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Your Profile</h2>
              <Link to="/edit-profile" className="btn-primary text-sm">
                ✏️ Edit Profile
              </Link>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={user?.avatar}
                  alt={user?.username}
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {user?.username}
                  </p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                </div>
              </div>

              {user?.bio ? (
                <div>
                  <span className="font-medium text-gray-700">Bio:</span>{" "}
                  <p className="text-gray-600 mt-1">{user?.bio}</p>
                </div>
              ) : (
                <div className="text-gray-500 italic">
                  No bio added yet.{" "}
                  <Link
                    to="/edit-profile"
                    className="text-primary-600 hover:underline"
                  >
                    Add one
                  </Link>
                </div>
              )}

              {user?.college && (
                <div>
                  <span className="font-medium text-gray-700">College:</span>{" "}
                  <span className="text-gray-600">{user?.college}</span>
                </div>
              )}

              {user?.yearOfStudy && (
                <div>
                  <span className="font-medium text-gray-700">
                    Year of Study:
                  </span>{" "}
                  <span className="text-gray-600">{user?.yearOfStudy}</span>
                </div>
              )}

              {user?.interests && user.interests.length > 0 ? (
                <div>
                  <span className="font-medium text-gray-700">Interests:</span>
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
              ) : (
                <div className="text-gray-500 italic">
                  No interests added yet.{" "}
                  <Link
                    to="/edit-profile"
                    className="text-primary-600 hover:underline"
                  >
                    Add some
                  </Link>
                </div>
              )}

              <div className="flex space-x-6 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {user?.reputation || 0}
                  </p>
                  <p className="text-sm text-gray-600">Reputation</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {user?.followersCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">
                    {user?.followingCount || 0}
                  </p>
                  <p className="text-sm text-gray-600">Following</p>
                </div>
              </div>
            </div>
          </div>

          {/* My Posts Section */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">My Content</h2>
              <Link to="/create-post" className="btn-primary text-sm">
                ✏️ Create New Post
              </Link>
            </div>

            {/* Filter Tabs */}
            <div className="flex space-x-2 mb-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All Posts
              </button>
              <button
                onClick={() => setActiveTab("question")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === "question"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Questions
              </button>
              <button
                onClick={() => setActiveTab("note")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === "note"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Notes
              </button>
              <button
                onClick={() => setActiveTab("article")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === "article"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Articles
              </button>

              <button
                onClick={() => setActiveTab("saved")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === "saved"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                📚 Saved Posts
              </button>
            </div>

            {/* Posts List */}
            {loading ? (
              <LoadingSpinner size="lg" text="Loading your posts..." />
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No posts yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Start sharing your knowledge with the community!
                </p>
                <Link to="/create-post" className="btn-primary inline-block">
                  Create Your First Post
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onDelete={handlePostDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
