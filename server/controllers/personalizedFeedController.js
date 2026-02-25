const mlService = require('../services/mlService');
const User = require('../models/User');

/**
 * @route   GET /api/posts/personalized-feed
 * @desc    Get ML-powered personalized feed for user
 * @access  Private
 */
exports.getPersonalizedFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    console.log(`📊 Generating personalized feed for ${req.user.username}...`);

    // Get personalized posts from ML service
    const posts = await mlService.getPersonalizedFeed(userId, parseInt(limit));

    if (posts.length === 0) {
      // Fallback to regular feed if ML fails
      const Post = require('../models/Post');
      const fallbackPosts = await Post.find({ status: 'published' })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('authorId', 'username avatar reputation')
        .lean();

      return res.status(200).json({
        success: true,
        posts: fallbackPosts,
        personalized: false,
        message: 'Showing recent posts',
      });
    }

    res.status(200).json({
      success: true,
      posts,
      personalized: true,
      count: posts.length,
    });

    console.log(`✅ Personalized feed generated: ${posts.length} posts`);
  } catch (error) {
    console.error('Personalized feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating personalized feed',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/posts/semantic-search
 * @desc    Semantic search using ML embeddings
 * @access  Public
 */
exports.semanticSearch = async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    console.log(`🔍 Semantic search: "${query}"`);

    const results = await mlService.searchPosts(query.trim(), parseInt(limit));

    res.status(200).json({
      success: true,
      query: query.trim(),
      posts: results,
      count: results.length,
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing semantic search',
      error: error.message,
    });
  }
};

module.exports = {
  getPersonalizedFeed: exports.getPersonalizedFeed,
  semanticSearch: exports.semanticSearch,
};