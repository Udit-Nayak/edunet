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
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getPosts);
router.get('/tag/:tag', getPostsByTag);
router.get('/user/:userId', getUserPosts);
router.get('/:id', getPostById);

// Protected routes
router.post('/', protect, createPost);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.post('/:id/upvote', protect, upvotePost);
router.post('/:id/downvote', protect, downvotePost);

module.exports = router;