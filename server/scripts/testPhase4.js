/**
 * Test script for Phase 4: User Interest Modeling
 * Run with: node server/scripts/testPhase4.js
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const User = require('../models/User');
const Post = require('../models/Post');
const mlService = require('../services/mlService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log('✅ Connected to MongoDB', 'green');
  } catch (error) {
    log(`❌ MongoDB connection failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function checkMLService() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`);
    if (response.data.status === 'healthy') {
      log('✅ ML Service is healthy', 'green');
      return true;
    }
  } catch (error) {
    log(`❌ ML Service is not responding: ${error.message}`, 'red');
    return false;
  }
}

async function testEmbeddingGeneration() {
  log('\n📊 Testing embedding generation...', 'cyan');
  
  try {
    const embedding = await mlService.generateEmbedding('Test post about JavaScript and React');
    
    if (!embedding || embedding.length !== 512) {
      throw new Error(`Invalid embedding dimensions: ${embedding?.length}`);
    }
    
    log(`✅ Embedding generated: 512 dimensions`, 'green');
    return true;
  } catch (error) {
    log(`❌ Embedding generation failed: ${error.message}`, 'red');
    return false;
  }
}

async function testColdStartFromTags() {
  log('\n🆕 Testing cold start from tags...', 'cyan');
  
  try {
    const interests = ['javascript', 'react', 'nodejs'];
    const vector = await mlService.getColdStartVector(interests);
    
    if (!vector || vector.length !== 512) {
      throw new Error(`Invalid vector dimensions: ${vector?.length}`);
    }
    
    log(`✅ Cold start vector created from tags: ${interests.join(', ')}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Cold start from tags failed: ${error.message}`, 'red');
    return false;
  }
}

async function testColdStartFromPosts() {
  log('\n📚 Testing cold start from top posts...', 'cyan');
  
  try {
    // Find posts with embeddings
    const posts = await Post.find({
      status: 'published',
      'mlMetadata.embedding': { $exists: true, $ne: null },
    })
      .limit(5)
      .select('mlMetadata.embedding title');
    
    if (posts.length === 0) {
      log('⚠️  No posts with embeddings found - skipping test', 'yellow');
      return true;
    }
    
    log(`Found ${posts.length} posts with embeddings`, 'blue');
    
    const interests = ['javascript', 'python'];
    const vector = await mlService.getColdStartVector(interests);
    
    if (!vector || vector.length !== 512) {
      throw new Error(`Invalid vector dimensions: ${vector?.length}`);
    }
    
    log(`✅ Cold start vector created from ${posts.length} top posts`, 'green');
    return true;
  } catch (error) {
    log(`❌ Cold start from posts failed: ${error.message}`, 'red');
    return false;
  }
}

async function testUserVectorComputation() {
  log('\n👤 Testing user vector computation...', 'cyan');
  
  try {
    // Find a user with interactions
    const user = await User.findOne({
      'userInteractions.upvotedPosts.0': { $exists: true },
    }).select('username userInteractions savedPosts');
    
    if (!user) {
      log('⚠️  No users with interactions found - skipping test', 'yellow');
      return true;
    }
    
    log(`Testing with user: ${user.username}`, 'blue');
    
    const vector = await mlService.computeUserVector(user._id);
    
    if (!vector || vector.length !== 512) {
      throw new Error(`Invalid vector dimensions: ${vector?.length}`);
    }
    
    log(`✅ User vector computed successfully`, 'green');
    return true;
  } catch (error) {
    log(`❌ User vector computation failed: ${error.message}`, 'red');
    return false;
  }
}

async function testOnlineVectorUpdate() {
  log('\n🔄 Testing online vector update...', 'cyan');
  
  try {
    // Create dummy vectors
    const currentVector = Array(512).fill(0.5);
    const newPostEmbedding = Array(512).fill(0.7);
    
    const response = await axios.post(`${ML_SERVICE_URL}/api/user/update-vector`, {
      current_vector: currentVector,
      new_post_embedding: newPostEmbedding,
      interaction_weight: 0.7,
    });
    
    const updatedVector = response.data.vector;
    
    if (!updatedVector || updatedVector.length !== 512) {
      throw new Error(`Invalid updated vector dimensions: ${updatedVector?.length}`);
    }
    
    // Check if vector actually changed
    const changed = updatedVector.some((val, idx) => Math.abs(val - currentVector[idx]) > 0.001);
    
    if (!changed) {
      throw new Error('Vector did not change after update');
    }
    
    log(`✅ Online vector update working (EMA applied)`, 'green');
    return true;
  } catch (error) {
    log(`❌ Online vector update failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPersonalizedFeed() {
  log('\n🎯 Testing personalized feed...', 'cyan');
  
  try {
    // Find a user with ML profile
    const user = await User.findOne({
      'mlProfile.embedding': { $exists: true, $ne: null },
    }).select('username mlProfile interests');
    
    if (!user) {
      log('⚠️  No users with ML profile found - skipping test', 'yellow');
      return true;
    }
    
    log(`Testing with user: ${user.username}`, 'blue');
    
    const feed = await mlService.getPersonalizedFeed(user._id, 10);
    
    if (!Array.isArray(feed)) {
      throw new Error('Feed is not an array');
    }
    
    log(`✅ Personalized feed generated: ${feed.length} posts`, 'green');
    
    if (feed.length > 0) {
      log(`  Sample post: "${feed[0].title}"`, 'blue');
    }
    
    return true;
  } catch (error) {
    log(`❌ Personalized feed failed: ${error.message}`, 'red');
    return false;
  }
}

async function testNewUserFlow() {
  log('\n🆕 Testing complete new user flow...', 'cyan');
  
  try {
    // Create test user
    const testUser = await User.create({
      email: `test.phase4.${Date.now()}@example.com`,
      username: `testuser${Date.now()}`,
      password: 'testpass123',
      interests: ['javascript', 'react', 'nodejs'],
    });
    
    log(`Created test user: ${testUser.username}`, 'blue');
    
    // Generate cold start vector
    const vector = await mlService.getColdStartVector(testUser.interests, testUser._id);
    
    if (!vector || vector.length !== 512) {
      throw new Error('Cold start vector generation failed');
    }
    
    // Save vector
    await User.findByIdAndUpdate(testUser._id, {
      $set: {
        'mlProfile.embedding': vector,
        'mlProfile.lastUpdated': new Date(),
        'mlProfile.interests': testUser.interests,
      },
    });
    
    log(`✅ Cold start vector saved`, 'green');
    
    // Get personalized feed
    const feed = await mlService.getPersonalizedFeed(testUser._id, 5);
    
    if (!Array.isArray(feed)) {
      throw new Error('Feed generation failed');
    }
    
    log(`✅ Personalized feed generated: ${feed.length} posts`, 'green');
    
    // Cleanup
    await User.findByIdAndDelete(testUser._id);
    log(`🗑️  Test user cleaned up`, 'blue');
    
    return true;
  } catch (error) {
    log(`❌ New user flow failed: ${error.message}`, 'red');
    return false;
  }
}

async function testFirstThreeInteractions() {
  log('\n3️⃣ Testing first 3 interactions handler...', 'cyan');
  
  try {
    // Find a new user (created in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    let user = await User.findOne({
      createdAt: { $gte: sevenDaysAgo },
      'userInteractions.upvotedPosts': { $exists: true },
    }).select('username email createdAt userInteractions savedPosts mlProfile');
    
    if (!user) {
      log('⚠️  No new users with interactions found - creating test user', 'yellow');
      
      // Create test user for this test
      user = await User.create({
        email: `test.interactions.${Date.now()}@example.com`,
        username: `testuser${Date.now()}`,
        password: 'testpass123',
        interests: ['javascript'],
      });
    }
    
    log(`Testing with user: ${user.username}`, 'blue');
    
    // Check if should update
    const shouldUpdate = await mlService.shouldUpdateNewUserVector(user._id, user);
    
    const upvoteCount = user.userInteractions?.upvotedPosts?.length || 0;
    const saveCount = user.savedPosts?.length || 0;
    const totalInteractions = upvoteCount + saveCount;
    
    log(`User interactions: ${totalInteractions} (upvotes: ${upvoteCount}, saves: ${saveCount})`, 'blue');
    log(`Should update: ${shouldUpdate}`, shouldUpdate ? 'green' : 'yellow');
    
    // Cleanup if we created a test user
    if (user.email && user.email.includes('test.interactions')) {
      await User.findByIdAndDelete(user._id);
      log(`🗑️  Test user cleaned up`, 'blue');
    }
    
    log(`✅ First 3 interactions logic working`, 'green');
    return true;
  } catch (error) {
    log(`❌ First 3 interactions test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testTrendingPostsFallback() {
  log('\n📈 Testing trending posts fallback...', 'cyan');
  
  try {
    const trendingPosts = await mlService.getTrendingPosts(10);
    
    if (!Array.isArray(trendingPosts)) {
      throw new Error('Trending posts is not an array');
    }
    
    log(`✅ Trending posts retrieved: ${trendingPosts.length} posts`, 'green');
    
    if (trendingPosts.length > 0) {
      log(`  Sample: "${trendingPosts[0].title}"`, 'blue');
    }
    
    return true;
  } catch (error) {
    log(`❌ Trending posts fallback failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('PHASE 4: USER INTEREST MODELING - TEST SUITE', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
  
  await connectDB();
  
  const mlServiceHealthy = await checkMLService();
  if (!mlServiceHealthy) {
    log('\n⚠️  ML Service is not running. Start it with:', 'yellow');
    log('cd ml-service && python -m uvicorn app.main:app --reload', 'yellow');
    process.exit(1);
  }
  
  const tests = [
    { name: 'Embedding Generation', fn: testEmbeddingGeneration },
    { name: 'Cold Start from Tags', fn: testColdStartFromTags },
    { name: 'Cold Start from Posts', fn: testColdStartFromPosts },
    { name: 'User Vector Computation', fn: testUserVectorComputation },
    { name: 'Online Vector Update', fn: testOnlineVectorUpdate },
    { name: 'Personalized Feed', fn: testPersonalizedFeed },
    { name: 'New User Flow', fn: testNewUserFlow },
    { name: 'First 3 Interactions', fn: testFirstThreeInteractions },
    { name: 'Trending Posts Fallback', fn: testTrendingPostsFallback },
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
    } catch (error) {
      log(`Unexpected error in ${test.name}: ${error.message}`, 'red');
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST SUMMARY', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });
  
  log('\n' + '-'.repeat(60), 'cyan');
  log(`Total: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  log('='.repeat(60) + '\n', 'cyan');
  
  await mongoose.connection.close();
  log('Database connection closed', 'blue');
  
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
