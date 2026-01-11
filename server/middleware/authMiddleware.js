const admin=require('../config/firebase')

const User = require('../models/User');
const cacheService = require('../services/cacheService');
const { verifyToken } = require('../utils/jwt');

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in Authorization header or cookies
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.',
      });
    }
    
    const decoded = verifyToken(token);
    
    const cacheKey = `user:${decoded.userId}`;
    let user = await cacheService.get(cacheKey);
    
    if (!user) {
      user = await User.findById(decoded.userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Token may be invalid.',
        });
      }
      
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated.',
        });
      }
      
      await cacheService.set(cacheKey, user, 300);
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route.',
      error: error.message,
    });
  }
};

exports.verifyFirebaseToken = async (req, res, next) => {
  try {
    const { firebaseToken } = req.body;
    
    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase token is required',
      });
    }
    
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    
    req.firebaseUser = decodedToken;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid Firebase token',
      error: error.message,
    });
  }
};