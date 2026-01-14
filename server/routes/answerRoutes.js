const express = require('express');
const router = express.Router();
const {
  createAnswer,
  getAnswersByPostId,
  updateAnswer,
  deleteAnswer,
  upvoteAnswer,
  downvoteAnswer,
  acceptAnswer,
} = require('../controllers/answerController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.get('/post/:postId', getAnswersByPostId);

// Protected routes
router.post('/', protect, createAnswer);
router.put('/:id', protect, updateAnswer);
router.delete('/:id', protect, deleteAnswer);
router.post('/:id/upvote', protect, upvoteAnswer);
router.post('/:id/downvote', protect, downvoteAnswer);
router.post('/:id/accept', protect, acceptAnswer);

module.exports = router;