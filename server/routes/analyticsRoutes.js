const express = require('express');
const router = express.Router();
const {
  trackInteraction,
  getMyInteractions,
  getPostAnalytics,
  getMLProfile,
  regenerateUserVector
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');


router.get('/ping', (req, res) => {
  console.log('🔔 /api/analytics/ping HIT');
  res.json({ ok: true });
});

// All routes require authentication
router.use(protect);

// Track interaction
router.post('/track-interaction', trackInteraction);

// Get user's interaction history
router.get('/my-interactions', getMyInteractions);

// Get post analytics (author only)
router.get('/post/:postId', getPostAnalytics);

// Get user's ML profile data
router.get('/ml-profile', getMLProfile);
router.post('/regenerate-user-vector', regenerateUserVector);

module.exports = router;