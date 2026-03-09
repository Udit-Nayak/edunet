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
    let isNewUser = false;

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

      isNewUser = true;
      console.log(`✅ New user registered via Google: ${username}`);
    } else {
      console.log(`✅ User logged in via Google: ${user.username}`);
    }
    
    user.lastActive = Date.now();
    await user.save();
    const token = require('../utils/jwt').generateToken(user._id);

const options = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    };
    
    res.status(200).cookie('token', token, options).json({
      success: true,
      token,
      user: user.getPublicProfile(),
      isNewUser, // Include this flag
    });
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

// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    console.log('📝 Update Profile Request Body:', JSON.stringify(req.body, null, 2));
    
    const { 
      bio, 
      college, 
      yearOfStudy, 
      interests,
      headline,
      location,
      website,
      socialLinks,
      education,
      experience,
      projects,
      skills,
      certifications,
      languages,
      publications,
      avatar
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Track if interests are being set for the first time
    const isFirstTimeSettingInterests = 
      (!user.interests || user.interests.length === 0) && 
      interests && 
      interests.length > 0;

    // Update basic fields
    if (bio !== undefined) user.bio = bio;
    if (college !== undefined) user.college = college;
    if (yearOfStudy !== undefined) user.yearOfStudy = yearOfStudy;
    if (interests !== undefined) user.interests = interests;
    if (avatar !== undefined) user.avatar = avatar;

    // Update LinkedIn-style fields
    if (headline !== undefined) user.headline = headline;
    if (location !== undefined) user.location = location;
    if (website !== undefined) user.website = website;
    if (socialLinks !== undefined) user.socialLinks = socialLinks;
    if (education !== undefined) user.education = education;
    if (experience !== undefined) user.experience = experience;
    if (projects !== undefined) user.projects = projects;
    if (skills !== undefined) user.skills = skills;
    if (certifications !== undefined) user.certifications = certifications;
    if (languages !== undefined) user.languages = languages;
    if (publications !== undefined) user.publications = publications;

    console.log('💾 Saving user with data:', {
      education: user.education?.length,
      experience: user.experience?.length,
      projects: user.projects?.length,
      skills: user.skills?.length,
      certifications: user.certifications?.length,
      languages: user.languages?.length
    });

    await user.save();

    console.log('✅ User saved successfully');
    
    // Verify the data was saved by refetching
    const savedUser = await User.findById(user._id);
    console.log('🔍 Verification - Data in DB:', {
      education: savedUser.education?.length,
      experience: savedUser.experience?.length,
      projects: savedUser.projects?.length,
      skills: savedUser.skills?.length,
      certifications: savedUser.certifications?.length,
      languages: savedUser.languages?.length
    });

    // Initialize user vector for new users with interests
    if (isFirstTimeSettingInterests) {
      console.log(`🎯 Initializing ML vector for new user: ${user.username}`);
      
      // Generate cold start vector in background
      const mlService = require('../services/mlService');
      mlService.getColdStartVector(interests, user._id)
        .then(async (vector) => {
          if (vector) {
            await User.findByIdAndUpdate(user._id, {
              $set: {
                'mlProfile.embedding': vector,
                'mlProfile.lastUpdated': new Date(),
                'mlProfile.interests': interests,
              },
            });
            console.log(`✅ ML vector initialized for ${user.username}`);
          }
        })
        .catch((err) => {
          console.error('Failed to initialize user vector:', err);
        });
    }

    // Clear cache
    await cacheService.del(`user:${user._id}`);
    await cacheService.del(`profile:${user._id}`);

    const publicProfile = user.getPublicProfile();
    console.log('📤 Sending back profile:', {
      education: publicProfile.education?.length,
      experience: publicProfile.experience?.length,
      projects: publicProfile.projects?.length,
      skills: publicProfile.skills?.length,
      certifications: publicProfile.certifications?.length,
      languages: publicProfile.languages?.length
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: publicProfile,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message,
    });
  }
};

// @desc    Update username
// @route   PUT /api/auth/username
// @access  Private
exports.updateUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
      });
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, and underscores',
      });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'Username must be between 3 and 30 characters',
      });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ 
      username, 
      _id: { $ne: req.user._id } // Exclude current user
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken',
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.username = username;
    await user.save();

    // Clear cache
    await cacheService.del(`user:${user._id}`);
    await cacheService.del(`profile:${user._id}`);

    res.status(200).json({
      success: true,
      message: 'Username updated successfully',
      user: user.getPublicProfile(),
    });
  } catch (error) {
    console.error('Update username error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating username',
      error: error.message,
    });
  }
};

// @route   GET /api/auth/user/:userId
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check cache for public profile
    const cacheKey = `profile:${userId}`;
    const cachedProfile = await cacheService.get(cacheKey);
    
    if (cachedProfile) {
      console.log(`✅ Cache hit: Public profile for user ${userId}`);
      return res.status(200).json(cachedProfile);
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    if (!user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'User account is inactive',
      });
    }
    
    const response = {
      success: true,
      user: user.getPublicProfile(),
    };
    
    // Cache public profile for 5 minutes
    await cacheService.set(cacheKey, response, 300);
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message,
    });
  }
};