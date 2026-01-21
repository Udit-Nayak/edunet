const reputationService = require('../services/reputationService');

/**
 * Middleware to track daily activity
 * Checks if user is active today and awards reputation accordingly
 */
exports.trackActivity = async (req, res, next) => {
  try {
    // Only track for authenticated users
    if (req.user && req.user._id) {
      // Run async without blocking the request
      reputationService.checkDailyActivity(req.user._id).catch(err => {
        console.error('Activity tracking error:', err);
      });
    }
    next();
  } catch (error) {
    // Don't block the request if activity tracking fails
    console.error('Activity middleware error:', error);
    next();
  }
};