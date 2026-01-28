import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { postAPI } from "../services/api";
import Navbar from "../components/common/Navbar";
import PostCard from "../components/post/PostCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { FiFilter, FiTrendingUp, FiClock, FiStar } from "react-icons/fi";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: "all", // all, question, note, article
    sortBy: "recent", // recent, popular, trending
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchPosts = async (pageNum, append = false) => {
    try {
      setLoading(true);
      const params = {
        page: pageNum,
        limit: 10,
        sortBy: filters.sortBy,
      };

      if (filters.type !== "all") {
        params.type = filters.type;
      }

      const response = await postAPI.getPosts(params);
      const newPosts = response.data.posts;

      if (append) {
        setPosts((prev) => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }

      setHasMore(
        response.data.pagination.currentPage <
          response.data.pagination.totalPages,
      );
      setPage(pageNum);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(page + 1, true);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feed</h1>
          <p className="text-gray-600">
            Discover questions, notes, and articles from the community
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Post Type Filter */}
            <div className="flex items-center space-x-2">
              <FiFilter className="w-5 h-5 text-gray-500" />
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="input-field py-2"
              >
                <option value="all">All Posts</option>
                <option value="question">Questions</option>
                <option value="note">Notes</option>
                <option value="article">Articles</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <button
                onClick={() => handleFilterChange("sortBy", "recent")}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filters.sortBy === "recent"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FiClock className="w-4 h-4" />
                <span>Recent</span>
              </button>
              <button
                onClick={() => handleFilterChange("sortBy", "popular")}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filters.sortBy === "popular"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FiStar className="w-4 h-4" />
                <span>Popular</span>
              </button>
              <button
                onClick={() => handleFilterChange("sortBy", "trending")}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filters.sortBy === "trending"
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FiTrendingUp className="w-4 h-4" />
                <span>Trending</span>
              </button>
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          {loading && page === 1 ? (
            <LoadingSpinner size="lg" text="Loading posts..." />
          ) : error ? (
            <ErrorMessage
              message={error}
              onRetry={() => fetchPosts(1, false)}
            />
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No posts found</p>
              <button
                onClick={() => navigate("/create-post")}
                className="btn-primary"
              >
                Create First Post
              </button>
            </div>
          ) : (
            <>
              {posts.map((post, index) => (
                <PostCard
                  key={post._id}
                  post={post}
                  position={index + 1} 
                  source="feed" 
                />
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="text-center py-4">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="btn-secondary"
                  >
                    {loading ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
