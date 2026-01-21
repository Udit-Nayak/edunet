const express = require('express');
const router = express.Router();
const {
  createComment,
  getCommentsByPost,
  getCommentsByAnswer,
  updateComment,
  deleteComment,
  upvoteComment,
} = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/post/:postId', getCommentsByPost);
router.get('/answer/:answerId', getCommentsByAnswer);

// Protected routes
router.post('/', protect, createComment);
router.put('/:id', protect, updateComment);
router.delete('/:id', protect, deleteComment);
router.post('/:id/upvote', protect, upvoteComment);

module.exports = router;