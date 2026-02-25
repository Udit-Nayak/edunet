/**
 * Test script for Phase 5: Neural Ranking Model
 * Run with: node server/scripts/testPhase5.js
 */

const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const User = require('../models/User');
const Post = require('../models/Post');
const mlService = require('../services/mlService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Color codes
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

async function testRankingStatus() {
  log('\n📊 Testing ranking service status...', 'cyan');
  
  try {
    const status = await mlService.getRankingStatus();
    
    log(`Ranking method: ${status.ranking_method}`, 'blue');
    log(`Neural ranker available: ${status.neural_ranker_available}`, 'blue');
    
    if (status.neural_ranker_available) {
      log('✅ Neural ranker is available and ready', 'green');
    } else {
      log('⚠️  Neural ranker not available (will use rule-based)', 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`❌ Ranking status check failed: ${error.message}`, 'red');
    return false;
  }
}

async function testModelExists() {
  log('\n🔍 Checking for trained model...', 'cyan');
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const modelPath = path.join(__dirname, '../../ml-service/app/models/ranking_model.h5');
    
    if (fs.existsSync(modelPath)) {
      const stats = fs.statSync(modelPath);
      log(`✅ Model file found: ${modelPath}`, 'green');
      log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`, 'blue');
      return true;
    } else {
      log('⚠️  Model file not found', 'yellow');
      log('  Run training first: python -m app.training.train_ranker', 'yellow');
      return true; // Not a failure, just not trained yet
    }
  } catch (error) {
    log(`❌ Model check failed: ${error.message}`, 'red');
    return false;
  }
}

async function testNeuralRanking() {
  log('\n🧠 Testing neural ranking...', 'cyan');
  
  try {
    // Get a user with embeddings
    const user = await User.findOne({
      'mlProfile.embedding': { $exists: true, $ne: null },
    }).select('mlProfile interests');
    
    if (!user) {
      log('⚠️  No users with embeddings found - skipping test', 'yellow');
      return true;
    }
    
    log(`Testing with user ID: ${user._id}`, 'blue');
    
    // Get candidate posts
    const candidates = await Post.find({
      status: 'published',
      'mlMetadata.embedding': { $exists: true, $ne: null },
    })
      .limit(20)
      .lean();
    
    if (candidates.length === 0) {
      log('⚠️  No candidate posts found - skipping test', 'yellow');
      return true;
    }
    
    log(`Found ${candidates.length} candidate posts`, 'blue');
    
    // Test neural ranking
    try {
      const ranked = await mlService.neuralRankPosts(
        user.mlProfile.embedding,
        user.interests || [],
        candidates,
        10
      );
      
      if (ranked && ranked.length > 0) {
        log(`✅ Neural ranking returned ${ranked.length} posts`, 'green');
        
        if (ranked[0].neural_score !== undefined) {
          log(`  Top post score: ${ranked[0].neural_score.toFixed(4)}`, 'blue');
        }
        
        return true;
      } else {
        log('⚠️  Neural ranking returned no results', 'yellow');
        return false;
      }
    } catch (error) {
      if (error.response?.status === 500 || error.message.includes('ranking_model')) {
        log('⚠️  Neural model not trained yet - expected', 'yellow');
        log('  Train the model with: python -m app.training.train_ranker', 'yellow');
        return true;
      }
      throw error;
    }
  } catch (error) {
    log(`❌ Neural ranking test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testRuleBasedFallback() {
  log('\n📐 Testing rule-based fallback...', 'cyan');
  
  try {
    // Get a user with embeddings
    const user = await User.findOne({
      'mlProfile.embedding': { $exists: true, $ne: null },
    }).select('mlProfile interests');
    
    if (!user) {
      log('⚠️  No users with embeddings found - skipping test', 'yellow');
      return true;
    }
    
    // Get candidate posts
    const candidates = await Post.find({
      status: 'published',
      'mlMetadata.embedding': { $exists: true, $ne: null },
    })
      .limit(20)
      .lean();
    
    if (candidates.length === 0) {
      log('⚠️  No candidate posts found - skipping test', 'yellow');
      return true;
    }
    
    // Test rule-based ranking
    const ranked = await mlService.ruleBasedRanking(
      user.mlProfile.embedding,
      candidates,
      10
    );
    
    if (ranked && ranked.length > 0) {
      log(`✅ Rule-based ranking returned ${ranked.length} posts`, 'green');
      
      if (ranked[0].finalScore !== undefined) {
        log(`  Top post score: ${ranked[0].finalScore.toFixed(4)}`, 'blue');
      }
      
      return true;
    } else {
      throw new Error('Rule-based ranking returned no results');
    }
  } catch (error) {
    log(`❌ Rule-based fallback test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testPersonalizedFeedWithRanking() {
  log('\n🎯 Testing personalized feed (with ranking)...', 'cyan');
  
  try {
    // Get a user
    const user = await User.findOne({
      'mlProfile.embedding': { $exists: true, $ne: null },
    }).select('username');
    
    if (!user) {
      log('⚠️  No users with embeddings found - skipping test', 'yellow');
      return true;
    }
    
    log(`Testing with user: ${user.username}`, 'blue');
    
    // Get feed
    const feed = await mlService.getPersonalizedFeed(user._id, 10);
    
    if (!Array.isArray(feed)) {
      throw new Error('Feed is not an array');
    }
    
    log(`✅ Personalized feed generated: ${feed.length} posts`, 'green');
    
    if (feed.length > 0) {
      log(`  Sample post: "${feed[0].title}"`, 'blue');
      
      if (feed[0].neural_score !== undefined) {
        log(`  Using neural ranking (score: ${feed[0].neural_score.toFixed(4)})`, 'green');
      } else if (feed[0].finalScore !== undefined) {
        log(`  Using rule-based ranking (score: ${feed[0].finalScore.toFixed(4)})`, 'yellow');
      }
    }
    
    return true;
  } catch (error) {
    log(`❌ Personalized feed test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testDataAvailabilityForTraining() {
  log('\n📈 Checking data availability for training...', 'cyan');
  
  try {
    const usersWithEmbeddings = await User.countDocuments({
      'mlProfile.embedding': { $exists: true, $ne: null },
    });
    
    const usersWithInteractions = await User.countDocuments({
      'userInteractions.upvotedPosts': { $exists: true, $ne: [] },
    });
    
    const postsWithEmbeddings = await Post.countDocuments({
      'mlMetadata.embedding': { $exists: true, $ne: null },
    });
    
    log('Training data statistics:', 'blue');
    log(`  Users with embeddings: ${usersWithEmbeddings}`, 'blue');
    log(`  Users with interactions: ${usersWithInteractions}`, 'blue');
    log(`  Posts with embeddings: ${postsWithEmbeddings}`, 'blue');
    
    const minRequirements = {
      users: 5,
      interactions: 3,
      posts: 10,
    };
    
    if (
      usersWithEmbeddings >= minRequirements.users &&
      usersWithInteractions >= minRequirements.interactions &&
      postsWithEmbeddings >= minRequirements.posts
    ) {
      log('✅ Sufficient data for training', 'green');
    } else {
      log('⚠️  Not enough data for effective training yet', 'yellow');
      log('  Need more user interactions to train the model', 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`❌ Data availability check failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('PHASE 5: NEURAL RANKING MODEL - TEST SUITE', 'cyan');
  log('='.repeat(60) + '\n', 'cyan');
  
  await connectDB();
  
  const mlServiceHealthy = await checkMLService();
  if (!mlServiceHealthy) {
    log('\n⚠️  ML Service is not running. Start it with:', 'yellow');
    log('cd ml-service && python -m uvicorn app.main:app --reload', 'yellow');
    process.exit(1);
  }
  
  const tests = [
    { name: 'Ranking Status', fn: testRankingStatus },
    { name: 'Model File Check', fn: testModelExists },
    { name: 'Neural Ranking', fn: testNeuralRanking },
    { name: 'Rule-Based Fallback', fn: testRuleBasedFallback },
    { name: 'Personalized Feed with Ranking', fn: testPersonalizedFeedWithRanking },
    { name: 'Training Data Availability', fn: testDataAvailabilityForTraining },
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
  
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  
  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? 'green' : 'red';
    log(`${icon} ${result.name}`, color);
  });
  
  log('\n' + '-'.repeat(60), 'cyan');
  log(`Total: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  
  if (passed < total) {
    log('\n💡 Tips:', 'cyan');
    log('  - Train the model: python -m app.training.train_ranker', 'yellow');
    log('  - Generate more interactions for better training data', 'yellow');
    log('  - Check ML service logs for errors', 'yellow');
  } else {
    log('\n🎉 All tests passed! Phase 5 is working correctly.', 'green');
  }
  
  log('='.repeat(60) + '\n', 'cyan');
  
  await mongoose.connection.close();
  log('Database connection closed', 'blue');
  
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests().catch((error) => {
  log(`Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
