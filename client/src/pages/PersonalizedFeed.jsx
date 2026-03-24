import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/common/Navbar';
import PostCard from '../components/post/PostCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiZap, FiClock, FiTrendingUp } from 'react-icons/fi';
import axios from 'axios';
import { postAPI } from '../services/api';

export default function PersonalizedFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedMode, setFeedMode] = useState('personalized'); // 'personalized' | 'recent' | 'trending'
  const [isPersonalized, setIsPersonalized] = useState(false);

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedMode]);

  const fetchFeed = async () => {
    try {
      setLoading(true);

      let response;
      if (feedMode === 'personalized') {
        response = await axios.get('/api/ml/feed/personalized', {
          params: { limit: 20 }
        });
        setIsPersonalized(response.data.personalized);
        setPosts(response.data.posts || []);
      } else if (feedMode === 'recent') {
        response = await postAPI.getPosts({
          sortBy: 'recent',
          limit: 20
        });
        setPosts(response.data.posts || []);
        setIsPersonalized(false);
      } else if (feedMode === 'trending') {
        response = await postAPI.getPosts({
          sortBy: 'popular',
          limit: 20
        });
        setPosts(response.data.posts || []);
        setIsPersonalized(false);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Track post view
  const trackPostView = useCallback(async (postId) => {
    try {
      await axios.post('/api/ml/track/interaction', {
        postId,
        action: 'view',
        metadata: { timestamp: Date.now() }
      });
    } catch {
      // Silently fail - tracking is optional
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Feed Mode Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFeedMode('personalized')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                feedMode === 'personalized'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiZap className="w-4 h-4" />
              <span>For You</span>
              {isPersonalized && feedMode === 'personalized' && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  AI
                </span>
              )}
            </button>

            <button
              onClick={() => setFeedMode('recent')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                feedMode === 'recent'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiClock className="w-4 h-4" />
              <span>Recent</span>
            </button>

            <button
              onClick={() => setFeedMode('trending')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                feedMode === 'trending'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FiTrendingUp className="w-4 h-4" />
              <span>Trending</span>
            </button>
          </div>

          {isPersonalized && feedMode === 'personalized' && (
            <p className="text-sm text-gray-600 mt-2">
              ✨ Posts ranked by AI based on your interests
            </p>
          )}
        </div>

        {/* Posts */}
        {loading ? (
          <LoadingSpinner size="lg" text="Loading your feed..." />
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600">
              Be the first to share something!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post._id}
                onMouseEnter={() => trackPostView(post._id)}
              >
                <PostCard post={post} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
