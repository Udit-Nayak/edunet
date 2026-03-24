import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { postAPI } from "../services/api";
import PageShell from "../components/common/PageShell";
import PostCard from "../components/post/PostCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { FiEdit2, FiStar, FiFileText, FiMessageSquare, FiBookOpen } from "react-icons/fi";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (user?._id) {
      fetchUserPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab]);

  const fetchUserPosts = async () => {
    try {
      setLoading(true);

      if (activeTab === "saved") {
        const response = await postAPI.getSavedPosts({
          page: 1,
          limit: 20,
        });
        setPosts(response.data.posts);
      } else if (activeTab === "drafts") {
        // Fetch drafts
        const response = await postAPI.getMyDrafts();
        setPosts(response.data.drafts);
      } else {
        const params = {
          page: 1,
          limit: 20,
        };

        if (activeTab !== "all") {
          params.type = activeTab;
        }

        const response = await postAPI.getUserPosts(user._id, params);
        setPosts(response.data.posts);
      }
    } catch {
      // Error fetching posts - show empty state
    } finally {
      setLoading(false);
    }
  };

  const handlePostDelete = (postId) => {
    setPosts(posts.filter((post) => post._id !== postId));
  };

  const tabs = [
    { id: "all", label: "All Posts", icon: <FiFileText className="w-4 h-4" /> },
    { id: "question", label: "Questions", icon: <FiMessageSquare className="w-4 h-4" /> },
    { id: "note", label: "Notes", icon: <FiBookOpen className="w-4 h-4" /> },
    { id: "article", label: "Articles", icon: <FiFileText className="w-4 h-4" /> },
    { id: "saved", label: "Saved Posts", icon: <FiStar className="w-4 h-4" /> },
    { id: "drafts", label: "Drafts", icon: <FiEdit2 className="w-4 h-4" /> },
  ];

  return (
    <PageShell showRightSidebar={false}>
      <div className="max-w-4xl mx-auto pb-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">
            Hello, {user?.username}! 👋
          </h1>
          <p className="text-[16px] font-medium text-text-secondary">
            Welcome to your dashboard
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-bg-secondary rounded-2xl shadow-card border border-border p-6 sm:p-8 mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-border">
            <div className="flex items-center space-x-4">
              <img
                src={user?.avatar}
                alt={user?.username}
                className="w-16 h-16 rounded-full border border-border object-cover bg-bg-primary"
              />
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  {user?.username}
                </h2>
                <p className="text-[14px] text-text-secondary">{user?.email}</p>
              </div>
            </div>
            
            <Link 
              to="/edit-profile" 
              className="inline-flex items-center justify-center px-5 py-2.5 bg-bg-primary text-text-primary font-bold text-[14px] rounded-xl border border-border hover:bg-surface-hover hover:border-border-light active:scale-[0.98] transition-all shadow-sm"
            >
              <FiEdit2 className="w-4 h-4 mr-2" />
              View/Edit Profile
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              {user?.bio ? (
                <div>
                  <h3 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-1.5">Bio</h3>
                  <p className="text-[15px] text-text-primary leading-relaxed">{user?.bio}</p>
                </div>
              ) : (
                <div className="text-[15px] text-text-secondary italic">
                  No bio added yet.{" "}
                  <Link
                    to="/edit-profile"
                    className="text-primary hover:underline font-medium not-italic"
                  >
                    Add one
                  </Link>
                </div>
              )}

              {user?.college && (
                <div>
                  <h3 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-1.5">Education</h3>
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-medium text-text-primary">{user?.college}</span>
                    <span className="text-[13px] text-text-secondary">Year {user?.yearOfStudy}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {user?.interests && user.interests.length > 0 ? (
                <div>
                  <h3 className="text-[13px] font-bold text-text-tertiary uppercase tracking-wide mb-2">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-hover font-bold text-[13px] rounded-full transition-colors cursor-default"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-[15px] text-text-secondary italic mt-5">
                  No interests added yet.{" "}
                  <Link
                    to="/edit-profile"
                    className="text-primary hover:underline font-medium not-italic"
                  >
                    Add some
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 pt-6 mt-6 border-t border-border">
            <div className="bg-bg-primary rounded-xl p-4 text-center border border-border shadow-sm">
              <p className="text-2xl font-bold text-primary mb-1">
                {user?.reputation || 0}
              </p>
              <p className="text-[12px] font-bold text-text-tertiary uppercase tracking-wide">Reputation</p>
            </div>
            <div className="bg-bg-primary rounded-xl p-4 text-center border border-border shadow-sm">
              <p className="text-2xl font-bold text-text-primary mb-1">
                {user?.followersCount || 0}
              </p>
              <p className="text-[12px] font-bold text-text-tertiary uppercase tracking-wide">Followers</p>
            </div>
            <div className="bg-bg-primary rounded-xl p-4 text-center border border-border shadow-sm">
              <p className="text-2xl font-bold text-text-primary mb-1">
                {user?.followingCount || 0}
              </p>
              <p className="text-[12px] font-bold text-text-tertiary uppercase tracking-wide">Following</p>
            </div>
          </div>
        </div>

        {/* My Posts Section */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-text-primary">My Content</h2>
            <Link 
              to="/create-post" 
              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white font-bold text-[14px] rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all shadow-sm"
            >
              <FiEdit2 className="w-4 h-4 mr-2" />
              Create New Post
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto no-scrollbar pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-[14px] transition-all whitespace-nowrap outline-none ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm ring-2 ring-primary ring-offset-2 ring-offset-bg-primary"
                    : "bg-bg-secondary text-text-secondary border border-border hover:bg-surface-hover hover:text-text-primary hover:border-border-light"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Posts List */}
          <div className="bg-bg-primary min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <LoadingSpinner size="lg" text="Loading your content..." />
              </div>
            ) : posts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16 bg-bg-secondary rounded-2xl shadow-card border border-border border-dashed"
              >
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                  <FiFileText className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">
                  No {activeTab} yet
                </h3>
                <p className="text-[15px] text-text-secondary mb-6 max-w-sm mx-auto">
                  {activeTab === 'saved' 
                    ? "You haven't saved any posts yet. Explore the feed to find interesting content." 
                    : activeTab === 'drafts'
                    ? "You don't have any drafts. Start writing a new post!"
                    : "Start sharing your knowledge with the community by creating your first post."}
                </p>
                {activeTab !== 'saved' && (
                  <Link 
                    to="/create-post" 
                    className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-bold text-[15px] rounded-xl hover:bg-primary-hover active:scale-[0.98] transition-all shadow-sm"
                  >
                    Create Your First Post
                  </Link>
                )}
              </motion.div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {posts.map((post) => (
                    <motion.div
                      key={post._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <PostCard
                        post={post}
                        onDelete={handlePostDelete}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
