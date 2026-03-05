import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { postAPI } from "../services/api";
import Navbar from "../components/common/Navbar";
import PostCard from "../components/post/PostCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";
import { FiFilter, FiTrendingUp, FiClock, FiStar, FiZap } from "react-icons/fi";

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: "all", // all, question, note, article
    sortBy: "recommended", // recommended, recent, popular, trending
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const observer = useRef();
  const lastPostElementRef = useRef();

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchPosts(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchPosts = useCallback(async (pageNum, append = false) => {
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

      // Use hybrid feed for recommended, otherwise use regular feed
      const response = filters.sortBy === "recommended" 
        ? await postAPI.getHybridFeed(params)
        : await postAPI.getPosts(params);
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
  }, [filters]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPosts(page + 1, true);
    }
  }, [loading, hasMore, page, fetchPosts]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    const callback = (entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    };

    observer.current = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: "100px", // Start loading 100px before reaching the element
    });

    if (lastPostElementRef.current) {
      observer.current.observe(lastPostElementRef.current);
    }

    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loading, hasMore, loadMore]);

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

        {/* AI Recommendation Banner */}
        {filters.sortBy === "recommended" && (
          <div className="bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <FiZap className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  AI-Powered Recommendations
                </h3>
                <p className="text-xs text-gray-600">
                  Posts personalized for you using content-based analysis (60%), collaborative filtering (30%), and trending topics (10%)
                </p>
              </div>
            </div>
          </div>
        )}

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
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="text-sm text-gray-600">Sort by:</span>
              <button
                onClick={() => handleFilterChange("sortBy", "recommended")}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filters.sortBy === "recommended"
                    ? "bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <FiZap className="w-4 h-4" />
                <span>Recommended</span>
              </button>
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

              {/* Infinite Scroll Sentinel & Loading Indicator */}
              {hasMore && (
                <div ref={lastPostElementRef} className="text-center py-8">
                  {loading && (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <p className="text-sm text-gray-500">Loading more posts...</p>
                    </div>
                  )}
                </div>
              )}

              {/* End of Feed Message */}
              {!hasMore && posts.length > 0 && (
                <div className="text-center py-8 border-t border-gray-200">
                  <p className="text-gray-500 text-sm">
                    🎉 You've reached the end! No more posts to show.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
