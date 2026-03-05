const express = require('express');
const router = express.Router();
const {
  recordInteraction,
  recordBatchInteractions,
  getUserEngagementMetrics,
  getPostPerformanceMetrics,
  getModelVersionForUser,
  startABTest,
  stopABTest,
  getABTestStatus,
  updateABTestMetrics,
  evaluatePromotion,
  promoteToProduction,
  listModelVersions,
  getModelVersion,
  getTrainingDataStats
} = require('../controllers/learningController');
const { protect } = require('../middleware/authMiddleware');

/**
 * Phase 9: Continuous Learning Routes
 */

// ========================================
// Interaction Tracking (Protected)
// ========================================

// Record single interaction
router.post('/interactions', protect, recordInteraction);

// Record batch interactions
router.post('/interactions/batch', protect, recordBatchInteractions);

// Get user engagement metrics
router.get('/interactions/user/metrics', protect, getUserEngagementMetrics);

// Get post performance metrics
router.get('/interactions/post/:postId/metrics', protect, getPostPerformanceMetrics);

// ========================================
// A/B Testing (Protected - User)
// ========================================

// Get model version for current user
router.get('/ab-test/assignment', protect, getModelVersionForUser);

// Get A/B test status
router.get('/ab-test/status', protect, getABTestStatus);

// ========================================
// A/B Testing Management (Admin Only)
// ========================================

// Start A/B test
router.post('/ab-test/start', protect, startABTest);

// Stop A/B test
router.post('/ab-test/stop', protect, stopABTest);

// Update A/B test metrics
router.post('/ab-test/update-metrics', protect, updateABTestMetrics);

// Evaluate if candidate should be promoted
router.post('/ab-test/evaluate', protect, evaluatePromotion);

// Promote candidate to production
router.post('/ab-test/promote', protect, promoteToProduction);

// ========================================
// Model Version Management (Admin Only)
// ========================================

// List all model versions
router.get('/models/versions', protect, listModelVersions);

// Get specific model version
router.get('/models/versions/:versionId', protect, getModelVersion);

// ========================================
// Training Data & Stats (Admin Only)
// ========================================

// Get training data statistics
router.get('/training/stats', protect, getTrainingDataStats);

module.exports = router;
