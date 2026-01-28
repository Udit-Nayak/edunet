/**
 * Test Script: Verify Interaction Tracking
 * 
 * This script tests the interaction tracking system
 * Usage: node backend/scripts/testInteractionTracking.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

async function testInteractionTracking() {
  try {
    console.log('🧪 Testing Interaction Tracking System\n');
    console.log('='.repeat(60));
    
    // Test 1: Connect to MongoDB
    console.log('\n📊 Test 1: MongoDB Connection');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Interaction = require('../models/Interaction');
    const User = require('../models/User');
    const Post = require('../models/Post');

    // Test 2: Check Models
    console.log('\n📊 Test 2: Check Models');
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    const interactionCount = await Interaction.countDocuments();
    
    console.log(`✅ Users in DB: ${userCount}`);
    console.log(`✅ Posts in DB: ${postCount}`);
    console.log(`✅ Interactions in DB: ${interactionCount}`);

    // Test 3: Check for ML fields in existing users
    console.log('\n📊 Test 3: Check ML Fields in Users');
    const sampleUser = await User.findOne();
    if (sampleUser) {
      console.log('✅ Sample User:', sampleUser.username);
      console.log('   - userInteractions:', sampleUser.userInteractions ? 'EXISTS' : 'MISSING');
      console.log('   - mlProfile:', sampleUser.mlProfile ? 'EXISTS' : 'MISSING');
      
      if (!sampleUser.userInteractions || !sampleUser.mlProfile) {
        console.log('\n⚠️  WARNING: Run migration script first!');
        console.log('   node backend/scripts/migrateMLFields.js');
      }
    }

    // Test 4: Check for ML fields in existing posts
    console.log('\n📊 Test 4: Check ML Fields in Posts');
    const samplePost = await Post.findOne();
    if (samplePost) {
      console.log('✅ Sample Post:', samplePost.title.substring(0, 50) + '...');
      console.log('   - mlMetadata:', samplePost.mlMetadata ? 'EXISTS' : 'MISSING');
      console.log('   - engagementMetrics:', samplePost.engagementMetrics ? 'EXISTS' : 'MISSING');
      
      if (!samplePost.mlMetadata || !samplePost.engagementMetrics) {
        console.log('\n⚠️  WARNING: Run migration script first!');
        console.log('   node backend/scripts/migrateMLFields.js');
      }
    }

    // Test 5: Create a test interaction directly
    console.log('\n📊 Test 5: Create Test Interaction Directly');
    if (sampleUser && samplePost) {
      const testInteraction = await Interaction.create({
        userId: sampleUser._id,
        postId: samplePost._id,
        action: 'view',
        metadata: {
          timeSpent: 45,
          scrollDepth: 80,
          source: 'feed',
          deviceType: 'desktop',
          sessionId: 'test-session-123',
          clickPosition: 1
        },
        label: 1
      });
      
      console.log('✅ Created test interaction:', testInteraction._id);
      
      // Clean up test interaction
      await Interaction.findByIdAndDelete(testInteraction._id);
      console.log('✅ Cleaned up test interaction');
    }

    // Test 6: Check Indexes
    console.log('\n📊 Test 6: Check Database Indexes');
    const interactionIndexes = await Interaction.collection.getIndexes();
    console.log('✅ Interaction Indexes:', Object.keys(interactionIndexes).join(', '));

    const userIndexes = await User.collection.getIndexes();
    console.log('✅ User Indexes:', Object.keys(userIndexes).join(', '));

    const postIndexes = await Post.collection.getIndexes();
    console.log('✅ Post Indexes:', Object.keys(postIndexes).join(', '));

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. If ML fields are missing, run: node backend/scripts/migrateMLFields.js');
    console.log('   2. Start your backend server: npm run dev');
    console.log('   3. Test tracking from frontend by viewing/clicking posts');
    console.log('   4. Check MongoDB to see interactions being created');
    console.log('   5. Use MongoDB Compass to query: db.interactions.find().sort({createdAt:-1})');

    await mongoose.connection.close();
    console.log('\n👋 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
console.log('🚀 Starting Interaction Tracking Tests...\n');
testInteractionTracking();