const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  getMe,
  logout,
  updateProfile,
  updateUsername
} = require('../controllers/authController');
const { protect, verifyFirebaseToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', verifyFirebaseToken, googleAuth);

router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

router.put('/profile', protect, updateProfile);
router.put('/username', protect, updateUsername);


module.exports = router;