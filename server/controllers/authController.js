const User = require('../models/User');
const cacheService = require('../services/cacheService');
const { sendTokenResponse } = require('../utils/jwt');

// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, username, and password',
      });
    }
    
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });
    
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
      });
    }
    
    const user = await User.create({
      email: email.toLowerCase(),
      username,
      password,
      authProvider: 'local',
    });
    
    console.log(`✅ New user registered: ${username}`);
    
    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message,
    });
  }
};

// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }
    
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.',
      });
    }
    
    if (user.authProvider === 'google') {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google Sign-In. Please sign in with Google.',
      });
    }
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }
    
    user.lastActive = Date.now();
    await user.save();
    
    console.log(`✅ User logged in: ${user.username}`);
    
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message,
    });
  }
};

// @route   POST /api/auth/google
exports.googleAuth = async (req, res) => {
  try {
    const { firebaseUser } = req; 
    
    let user = await User.findOne({ firebaseUid: firebaseUser.uid });
    
    if (!user) {
      const existingEmailUser = await User.findOne({ 
        email: firebaseUser.email.toLowerCase() 
      });
      
      if (existingEmailUser && existingEmailUser.authProvider === 'local') {
        return res.status(400).json({
          success: false,
          message: 'An account with this email already exists. Please sign in with email/password.',
        });
      }
      
      const username = firebaseUser.email.split('@')[0] + Math.floor(Math.random() * 10000);
      
      user = await User.create({
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email.toLowerCase(),
        username,
        avatar: firebaseUser.picture || undefined,
        authProvider: 'google',
        isEmailVerified: firebaseUser.email_verified || false,
      });
      
      console.log(`✅ New user registered via Google: ${username}`);
    } else {
      console.log(`✅ User logged in via Google: ${user.username}`);
    }
    
    user.lastActive = Date.now();
    await user.save();
    
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Error with Google authentication',
      error: error.message,
    });
  }
};

// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user.getPublicProfile(),
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message,
    });
  }
};

// @route   POST /api/auth/logout
exports.logout = async (req, res) => {
  try {
    await cacheService.del(`user:${req.user._id}`);
    
    res.status(200).cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), 
      httpOnly: true,
    }).json({
      success: true,
      message: 'Logged out successfully',
    });
    
    console.log(`✅ User logged out: ${req.user.username}`);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message,
    });
  }
};