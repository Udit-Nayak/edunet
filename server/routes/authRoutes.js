const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  getMe,
  logout,
} = require('../controllers/authController');
const { protect, verifyFirebaseToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', verifyFirebaseToken, googleAuth);

router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;