const reputationService = require('../services/reputationService');

/**
 * Middleware to track user activity and award daily active bonuses
 */
exports.trackActivity = async (req, res, next) => {
  try {
    // Only track if user is authenticated
    if (req.user && req.user._id) {
      // Run asynchronously - don't block the request
      reputationService.checkDailyActivity(req.user._id).catch((err) => {
        console.error('Error tracking daily activity:', err);
      });
    }
    
    next();
  } catch (error) {
    // Don't block request on error
    console.error('Activity tracking middleware error:', error);
    next();
  }
};