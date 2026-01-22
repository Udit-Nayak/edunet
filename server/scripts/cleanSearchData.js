require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Answer = require('../models/Answer');

// Demo user emails (to identify and delete)
const demoUserEmails = [
  'alice@example.com',
  'bob@example.com',
  'charlie@example.com',
  'diana@example.com',
  'eve@example.com',
  'frank@example.com',
  'grace@example.com',
  'henry@example.com',
];

async function cleanDatabase() {
  try {
    console.log('🧹 Starting database cleanup...\n');
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find demo users
    console.log('👥 Finding demo users...');
    const demoUsers = await User.find({ 
      email: { $in: demoUserEmails } 
    });
    
    console.log(`   Found ${demoUsers.length} demo users\n`);

    if (demoUsers.length === 0) {
      console.log('✨ No demo data found. Database is already clean!');
      await mongoose.connection.close();
      process.exit(0);
    }

    const demoUserIds = demoUsers.map(u => u._id);

    // Delete posts created by demo users
    console.log('📝 Deleting posts by demo users...');
    const deletedPosts = await Post.deleteMany({
      authorId: { $in: demoUserIds }
    });
    console.log(`   ✅ Deleted ${deletedPosts.deletedCount} posts\n`);

    // Delete answers created by demo users
    console.log('💬 Deleting answers by demo users...');
    const deletedAnswers = await Answer.deleteMany({
      authorId: { $in: demoUserIds }
    });
    console.log(`   ✅ Deleted ${deletedAnswers.deletedCount} answers\n`);

    // Delete demo users
    console.log('👥 Deleting demo users...');
    const deletedUsers = await User.deleteMany({
      _id: { $in: demoUserIds }
    });
    console.log(`   ✅ Deleted ${deletedUsers.deletedCount} users\n`);

    console.log('✨ Database cleanup completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   👥 Users deleted: ${deletedUsers.deletedCount}`);
    console.log(`   📝 Posts deleted: ${deletedPosts.deletedCount}`);
    console.log(`   💬 Answers deleted: ${deletedAnswers.deletedCount}`);

    await mongoose.connection.close();
    console.log('\n👋 MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error cleaning database:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanDatabase();