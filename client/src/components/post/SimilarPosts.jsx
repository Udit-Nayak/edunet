import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { postAPI } from "../../services/api";
import { FiZap, FiEye, FiThumbsUp, FiTag } from "react-icons/fi";
import { formatNumber } from "../../utils/formatters";

export default function SimilarPosts({ postId }) {
  const [similarPosts, setSimilarPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (postId) {
      fetchSimilarPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const fetchSimilarPosts = async () => {
    try {
      setLoading(true);
      const response = await postAPI.getSimilarPosts(postId, { limit: 5 });
      
      if (response.data.success) {
        setSimilarPosts(response.data.similarPosts || []);
      }
    } catch {
      // Failed to fetch similar posts - component will show empty state
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  // Show empty state if no posts or error
  if (!similarPosts || similarPosts.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <FiZap className="w-5 h-5 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No similar discussions found yet.</p>
        <p className="text-xs text-gray-400 mt-1">Similar posts will appear as the community grows.</p>
      </div>
    );
  }



  return (
    <div className="space-y-3">
        {similarPosts.map((post) => (
          <Link
            key={post._id}
            to={`/post/${post._id}`}
            className="block group"
          >
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-primary-400 hover:bg-primary-50 transition-all duration-200">
              {/* Badge */}
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                    post.type === "question"
                      ? "bg-blue-100 text-blue-700"
                      : post.type === "note"
                        ? "bg-green-100 text-green-700"
                        : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {post.type}
                </span>
                
                {/* Similarity Score */}
                {post.similarity !== undefined && (
                  <span className="text-xs font-semibold text-primary-600">
                    {(post.similarity * 100).toFixed(0)}% match
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-medium text-gray-900 group-hover:text-primary-600 mb-2 line-clamp-2">
                {post.title}
              </h3>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex items-center space-x-1 mb-2 flex-wrap">
                  <FiTag className="w-3 h-3 text-gray-400" />
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{post.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <FiThumbsUp className="w-3 h-3" />
                  <span>{formatNumber(post.upvotes || 0)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FiEye className="w-3 h-3" />
                  <span>{formatNumber(post.viewCount || 0)}</span>
                </div>
                {post.authorId?.username && (
                  <span className="text-gray-400">
                    by {post.authorId.username}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
}
