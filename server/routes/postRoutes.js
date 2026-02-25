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

} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const mlService = require('../services/mlService');
const { getPersonalizedFeed, semanticSearch } = require('../controllers/personalizedFeedController');



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
router.get('/drafts/my-drafts', protect, getMyDrafts);
router.get('/drafts/:id', protect, getDraftById);
router.delete('/drafts/cleanup', protect, cleanupOldDrafts);

// Protected routes - IMPORTANT: Put specific routes BEFORE dynamic :id route
router.get('/saved', protect, getSavedPosts); 
router.get('/:id/is-saved', protect, checkPostSaved);
router.get('/:id',optionalAuth, getPostById);

// Other protected routes
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/upvote', protect, upvotePost);
router.post('/:id/downvote', protect, downvotePost);
router.post('/:id/save', protect, savePost);


router.get('/personalized-feed', protect, getPersonalizedFeed);
router.post('/semantic-search', semanticSearch);

router.post('/semantic-search', protect, async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    
    // Get results from ML service
    const mlResults = await mlService.searchPosts(query, limit);
    
    // Get full post details from MongoDB
    const postIds = mlResults.map(r => r.post_id);
    const posts = await Post.find({ post_id: { $in: postIds } });
    
    res.status(200).json({
      success: true,
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Semantic search failed',
      error: error.message
    });
  }
});
module.exports = router;