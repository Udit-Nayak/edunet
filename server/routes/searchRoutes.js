const express = require('express');
const router = express.Router();
const {
  search,
  getSuggestions,
  getTrendingSearches,
  getPopularTags,
  trackSearch,
} = require('../controllers/searchController');

// Optional auth middleware - adds user data if authenticated
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      const { verifyToken } = require('../utils/jwt');
      const User = require('../models/User');
      
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch {
    next();
  }
};


// Main search endpoint
router.get('/', optionalAuth, search);

// Autocomplete suggestions
router.get('/suggestions', getSuggestions);

// Trending searches
router.get('/trending', getTrendingSearches);

// Popular tags
router.get('/popular-tags', getPopularTags);

// Track search (for analytics)
router.post('/track', trackSearch);

module.exports = router;