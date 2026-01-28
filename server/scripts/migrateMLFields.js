/**
 * Migration Script: Add ML fields to existing Users and Posts
 * 
 * Run this once after updating the models
 * Usage: node backend/scripts/migrateMLFields.js
 */

// Load .env from parent directory (server folder)
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');

async function migrateData() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Migrate Users
    console.log('👥 Migrating Users...');
    const usersWithoutML = await User.find({
      userInteractions: { $exists: false }
    });

    console.log(`   Found ${usersWithoutML.length} users without ML fields\n`);

    let userCount = 0;
    for (const user of usersWithoutML) {
      user.userInteractions = {
        viewedPosts: [],
        upvotedPosts: [],
        downvotedPosts: [],
        clickedTags: [],
        searchHistory: []
      };

      user.mlProfile = {
        embedding: null,
        lastUpdated: null,
        interests: user.interests || [],
        topTags: []
      };

      await user.save();
      userCount++;

      if (userCount % 10 === 0) {
        console.log(`   ✅ Migrated ${userCount}/${usersWithoutML.length} users`);
      }
    }

    console.log(`\n✅ Migrated ${userCount} users\n`);

    // 2. Migrate Posts
    console.log('📝 Migrating Posts...');
    const postsWithoutML = await Post.find({
      mlMetadata: { $exists: false }
    });

    console.log(`   Found ${postsWithoutML.length} posts without ML fields\n`);

    let postCount = 0;
    for (const post of postsWithoutML) {
      post.mlMetadata = {
        embedding: null,
        predictedTags: [],
        semanticTopics: [],
        lastEmbeddingUpdate: null
      };

      post.engagementMetrics = {
        avgTimeSpent: 0,
        clickThroughRate: 0,
        completionRate: 0,
        totalImpressions: 0,
        totalClicks: 0
      };

      await post.save();
      postCount++;

      if (postCount % 10 === 0) {
        console.log(`   ✅ Migrated ${postCount}/${postsWithoutML.length} posts`);
      }
    }

    console.log(`\n✅ Migrated ${postCount} posts\n`);

    console.log('✨ Migration complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   👥 Users migrated: ${userCount}`);
    console.log(`   📝 Posts migrated: ${postCount}`);

    await mongoose.connection.close();
    console.log('\n👋 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
console.log('='.repeat(60));
console.log('ML FIELDS MIGRATION');
console.log('='.repeat(60));
console.log('');

migrateData();