const InteractionEvent = require('../models/InteractionEvent');
const interactionTrackingService = require('../services/interactionTrackingService');

/**
 * Phase 9: Daily Batch Processing Job
 * Processes unprocessed interaction events to generate training labels
 * 
 * Run this daily via cron job or scheduler
 */

async function processDailyInteractions() {
  try {
    console.log('\n==============================================');
    console.log('🔄 Starting Daily Interaction Processing');
    console.log(`⏰ ${new Date().toISOString()}`);
    console.log('==============================================\n');

    const startTime = Date.now();

    // 1. Process impression events (pair with follow-up actions)
    console.log('📍 Step 1: Processing impression events...');
    const impressionResult = await interactionTrackingService.processImpressions(10000);
    console.log(`✅ Processed ${impressionResult.processed} impressions`);
    console.log(`   Positive: ${impressionResult.positive}`);
    console.log(`   Negative: ${impressionResult.negative}\n`);

    // 2. Process direct events (clicks, upvotes, etc.)
    console.log('📍 Step 2: Processing direct interaction events...');
    const directResult = await interactionTrackingService.processDirectEvents(10000);
    console.log(`✅ Processed ${directResult} direct events\n`);

    // 3. Get statistics
    console.log('📍 Step 3: Collecting statistics...');
    const stats = await getProcessingStats();
    console.log(`📊 Processing Statistics:`);
    console.log(`   Total events in DB: ${stats.totalEvents}`);
    console.log(`   Unprocessed events: ${stats.unprocessedEvents}`);
    console.log(`   Ready for training: ${stats.readyForTraining}`);
    console.log(`   Already used: ${stats.usedForTraining}\n`);

    // 4. Cleanup old events (optional)
    console.log('📍 Step 4: Cleaning up old events...');
    const cleanupResult = await interactionTrackingService.cleanupOldEvents(90);
    console.log(`✅ Cleaned up ${cleanupResult} old events\n`);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('==============================================');
    console.log(`✅ Daily Processing Complete (${duration}s)`);
    console.log('==============================================\n');

    return {
      success: true,
      impressionsProcessed: impressionResult.processed,
      directEventsProcessed: directResult,
      cleanedUp: cleanupResult,
      stats,
      duration
    };

  } catch (error) {
    console.error('❌ Error in daily processing:', error);
    throw error;
  }
}

async function getProcessingStats() {
  const [
    totalEvents,
    unprocessedEvents,
    readyForTraining,
    usedForTraining
  ] = await Promise.all([
    InteractionEvent.countDocuments({}),
    InteractionEvent.countDocuments({ processed: false }),
    InteractionEvent.countDocuments({
      trainingLabel: { $in: [0, 1] },
      processed: true,
      usedForTraining: false
    }),
    InteractionEvent.countDocuments({ usedForTraining: true })
  ]);

  return {
    totalEvents,
    unprocessedEvents,
    readyForTraining,
    usedForTraining
  };
}

// Export the main function
module.exports = {
  processDailyInteractions,
  getProcessingStats
};

// If run directly (not imported)
if (require.main === module) {
  require('dotenv').config({ path: './server/.env' });
  const mongoose = require('mongoose');

  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('✅ MongoDB Connected');
      return processDailyInteractions();
    })
    .then((result) => {
      console.log('Result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
