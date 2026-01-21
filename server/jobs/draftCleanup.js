const cron = require('node-cron');
const Post = require('../models/Post');

/**
 * Scheduled job to clean up drafts older than 3 days
 * Runs every day at 2:00 AM
 */
const scheduleDraftCleanup = () => {
  // Schedule: Run at 2:00 AM every day
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('🧹 Running draft cleanup job...');
      
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      const result = await Post.deleteMany({
        status: 'draft',
        $or: [
          { draftCreatedAt: { $lte: threeDaysAgo } },
          { 
            draftCreatedAt: null,
            createdAt: { $lte: threeDaysAgo }
          }
        ],
      });

      console.log(`✅ Draft cleanup complete: Deleted ${result.deletedCount} old drafts`);
    } catch (error) {
      console.error('❌ Draft cleanup error:', error);
    }
  });

  console.log('📅 Draft cleanup job scheduled (runs daily at 2:00 AM)');
};

module.exports = { scheduleDraftCleanup };