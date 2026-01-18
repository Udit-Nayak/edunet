
require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('../models/Post');

const resetViewCounts = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('📊 Resetting all view counts...');
    const result = await Post.updateMany(
      {},
      { $set: { viewCount: 0 } }
    );

    console.log(`✅ Reset ${result.modifiedCount} posts' view counts to 0`);
    console.log('✨ All view counts have been reset!');

    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting view counts:', error);
    process.exit(1);
  }
};

resetViewCounts();