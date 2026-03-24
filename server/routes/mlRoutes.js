const express = require('express');
const router = express.Router();
const mlService = require('../services/mlService');
const { protect } = require('../middleware/authMiddleware');
const Post = require('../models/Post');

// ============================================
// Phase 10: ML Service Integration Routes
// ============================================

/**
 * @route   GET /api/ml/feed/personalized
 * @desc    Get personalized feed for user
 * @access  Private
 */
router.get('/feed/personalized', protect, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user._id.toString();

    const result = await mlService.getPersonalizedFeed(userId, parseInt(limit));

    if (!result || result.length === 0 || result.fallback) {
      // Fallback to regular feed
      const posts = await Post.find({ status: 'published' })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('authorId', 'username avatar reputation');

      return res.json({
        success: true,
        posts,
        personalized: false
      });
    }

    res.json({
      success: true,
      posts: result,
      personalized: true
    });
  } catch (error) {
    console.error('Personalized feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching personalized feed'
    });
  }
});

/**
 * @route   POST /api/ml/tags/suggest
 * @desc    Get tag suggestions for text
 * @access  Private
 */
router.post('/tags/suggest', protect, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 30) {
      return res.json({
        success: true,
        suggested_tags: []
      });
    }

    const tags = await mlService.suggestTags(text);

    res.json({
      success: true,
      suggested_tags: tags
    });
  } catch (error) {
    console.error('Tag suggestion error:', error);
    res.status(500).json({
      success: false,
      message: 'Error suggesting tags'
    });
  }
});

/**
 * @route   GET /api/ml/similar/:postId
 * @desc    Get similar posts
 * @access  Public
 */
router.get('/similar/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 10 } = req.query;

    const result = await mlService.getSimilarPosts(postId, parseInt(limit));

    res.json({
      success: true,
      posts: result || [],
      scores: []
    });
  } catch (error) {
    console.error('Similar posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching similar posts',
      posts: [],
      scores: []
    });
  }
});

/**
 * @route   POST /api/ml/track/interaction
 * @desc    Track user interaction for ML training
 * @access  Private
 */
router.post('/track/interaction', protect, async (req, res) => {
  try {
    const { postId, action, metadata } = req.body;
    const userId = req.user._id.toString();

    await mlService.trackInteraction(userId, postId, action, metadata);

    res.json({
      success: true,
      message: 'Interaction tracked'
    });
  } catch {
    // Don't fail - tracking is non-critical
    res.json({
      success: true,
      message: 'Tracking skipped'
    });
  }
});

/**
 * @route   GET /api/ml/health
 * @desc    ML service health check
 * @access  Public
 */
router.get('/health', async (req, res) => {
  const healthy = await mlService.healthCheck();
  
  res.json({
    success: true,
    ml_service: healthy ? 'online' : 'offline'
  });
});

module.exports = router;
