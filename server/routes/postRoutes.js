const express = require('express');
const router = express.Router();
const {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  upvotePost,
  downvotePost,
  getPostsByTag,
  getUserPosts,
  savePost,
  getSavedPosts,
  checkPostSaved,
  getMyDrafts,
  getDraftById,
  cleanupOldDrafts,
  getSimilarPosts,
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const mlService = require('../services/mlService');
const { getPersonalizedFeed, semanticSearch, getHybridFeed } = require('../controllers/personalizedFeedController');



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
  } catch (error) {
    next();
  }
};


// Public routes
router.get('/',optionalAuth ,getPosts);
router.get('/tag/:tag',optionalAuth, getPostsByTag);
router.get('/user/:userId',optionalAuth, getUserPosts);

// Specific routes - MUST come before /:id to avoid being caught by it
router.get('/personalized-feed', protect, getPersonalizedFeed);
router.get('/hybrid-feed', protect, getHybridFeed);
router.get('/drafts/my-drafts', protect, getMyDrafts);
router.get('/drafts/:id', protect, getDraftById);
router.delete('/drafts/cleanup', protect, cleanupOldDrafts);

// Protected routes with :id - Put sub-routes BEFORE the base :id route
router.get('/saved', protect, getSavedPosts); 
router.get('/:id/is-saved', protect, checkPostSaved);
router.get('/:id/similar', optionalAuth, getSimilarPosts); // Phase 8: Similar posts
router.get('/:id',optionalAuth, getPostById);

// Other protected routes
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/upvote', protect, upvotePost);
router.post('/:id/downvote', protect, downvotePost);
router.post('/:id/save', protect, savePost);

router.post('/semantic-search', semanticSearch);

module.exports = router;