/**
 * Phase 9: Quick Start Script
 * 
 * This script helps you verify Phase 9 is working correctly and get started quickly.
 * It will:
 * 1. Check database connections
 * 2. Verify all models are registered
 * 3. Create sample interaction data (if requested)
 * 4. Show current statistics
 * 5. Guide you through next steps
 * 
 * Usage: node server/scripts/phase9QuickStart.js [--create-sample-data]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const InteractionEvent = require('../models/InteractionEvent');
const ModelVersion = require('../models/ModelVersion');
const User = require('../models/User');
const Post = require('../models/Post');
const interactionTrackingService = require('../services/interactionTrackingService');

const args = process.argv.slice(2);
const shouldCreateSampleData = args.includes('--create-sample-data');

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
}

async function checkCollections() {
  console.log('\n📊 Checking Collections...');
  
  try {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const requiredCollections = ['interactionevents', 'modelversions', 'users', 'posts'];
    const missingCollections = requiredCollections.filter(c => !collectionNames.includes(c));
    
    if (missingCollections.length > 0) {
      console.log(`⚠️  Missing collections: ${missingCollections.join(', ')}`);
      console.log('   Collections will be created automatically on first use.');
    } else {
      console.log('✅ All required collections exist');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking collections:', error.message);
    return false;
  }
}

async function getStatistics() {
  console.log('\n📈 Current Statistics...');
  
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalInteractions = await InteractionEvent.countDocuments();
    const processedInteractions = await InteractionEvent.countDocuments({ processed: true });
    const readyForTraining = await InteractionEvent.countDocuments({
      processed: true,
      trainingLabel: { $in: [0, 1] },
      usedForTraining: false,
      'userSnapshot.embedding': { $exists: true },
      'postSnapshot.embedding': { $exists: true }
    });
    const usedForTraining = await InteractionEvent.countDocuments({ usedForTraining: true });
    const modelVersions = await ModelVersion.countDocuments();
    const productionModels = await ModelVersion.countDocuments({ status: 'production' });
    const candidateModels = await ModelVersion.countDocuments({ status: 'candidate' });
    const abTestingModels = await ModelVersion.countDocuments({ status: 'ab_testing' });
    
    console.log('\n📊 Database Contents:');
    console.log(`   Users: ${totalUsers}`);
    console.log(`   Posts: ${totalPosts}`);
    console.log(`   Total Interactions: ${totalInteractions}`);
    console.log(`   Processed: ${processedInteractions}`);
    console.log(`   Ready for Training: ${readyForTraining}`);
    console.log(`   Used for Training: ${usedForTraining}`);
    console.log(`   Model Versions: ${modelVersions}`);
    console.log(`     - Production: ${productionModels}`);
    console.log(`     - Candidate: ${candidateModels}`);
    console.log(`     - A/B Testing: ${abTestingModels}`);
    
    if (totalInteractions > 0) {
      // Show event type distribution
      const eventTypes = await InteractionEvent.aggregate([
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      
      console.log('\n📋 Event Type Distribution:');
      eventTypes.forEach(et => {
        console.log(`   ${et._id}: ${et.count}`);
      });
    }
    
    return {
      totalUsers,
      totalPosts,
      totalInteractions,
      readyForTraining,
      productionModels
    };
  } catch (error) {
    console.error('❌ Error getting statistics:', error.message);
    return null;
  }
}

async function createSampleData() {
  console.log('\n🎲 Creating Sample Interaction Data...');
  
  try {
    const users = await User.find().limit(10);
    const posts = await Post.find().limit(10);
    
    if (users.length === 0 || posts.length === 0) {
      console.log('⚠️  Need at least 1 user and 1 post to create sample data');
      return false;
    }
    
    console.log(`   Found ${users.length} users and ${posts.length} posts`);
    
    let created = 0;
    
    // Create diverse sample interactions
    for (let i = 0; i < Math.min(users.length, posts.length); i++) {
      const user = users[i];
      const post = posts[i];
      
      // Impression
      await interactionTrackingService.recordInteraction({
        userId: user._id,
        postId: post._id,
        eventType: 'impression',
        context: {
          source: 'feed',
          position: i + 1,
          page: 'feed',
          device: 'desktop'
        }
      });
      created++;
      
      // Some users click (60% CTR)
      if (i % 5 !== 4) {
        await interactionTrackingService.recordInteraction({
          userId: user._id,
          postId: post._id,
          eventType: 'click',
          context: {
            source: 'feed',
            position: i + 1
          }
        });
        created++;
        
        // Some read (50% of clickers)
        if (i % 2 === 0) {
          await interactionTrackingService.recordInteraction({
            userId: user._id,
            postId: post._id,
            eventType: 'read',
            readTime: 45 + Math.floor(Math.random() * 60),
            scrollDepth: 70 + Math.floor(Math.random() * 30),
            context: {
              source: 'detail'
            }
          });
          created++;
          
          // Some engage (30% of readers)
          if (i % 3 === 0) {
            const engagementType = ['upvote', 'save', 'comment'][i % 3];
            await interactionTrackingService.recordInteraction({
              userId: user._id,
              postId: post._id,
              eventType: engagementType,
              context: {
                source: 'detail'
              }
            });
            created++;
          }
        } else {
          // Quick exit
          await interactionTrackingService.recordInteraction({
            userId: user._id,
            postId: post._id,
            eventType: 'quick_exit',
            readTime: 2,
            context: {
              source: 'detail'
            }
          });
          created++;
        }
      }
    }
    
    console.log(`✅ Created ${created} sample interaction events`);
    return true;
  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
    return false;
  }
}

async function showNextSteps(stats) {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 PHASE 9: NEXT STEPS');
  console.log('═'.repeat(70));
  
  if (stats.totalUsers === 0 || stats.totalPosts === 0) {
    console.log('\n⚠️  PREREQUISITE: Need users and posts in database');
    console.log('   1. Create some users (register via UI)');
    console.log('   2. Create some posts (via UI)');
    console.log('   3. Re-run this script');
    return;
  }
  
  if (stats.totalInteractions === 0) {
    console.log('\n📝 STEP 1: Collect Interaction Data');
    console.log('   Option A: Use the application normally');
    console.log('     - Browse feed → impressions recorded');
    console.log('     - Click posts → clicks recorded');
    console.log('     - Upvote/save → engagement recorded');
    console.log('');
    console.log('   Option B: Generate sample data');
    console.log('     node server/scripts/phase9QuickStart.js --create-sample-data');
    return;
  }
  
  if (stats.totalInteractions < 100) {
    console.log('\n📊 CURRENT STATUS: Collecting initial data...');
    console.log(`   Progress: ${stats.totalInteractions}/100 interactions`);
    console.log('   Continue browsing the application to generate more interactions');
    console.log('');
    console.log('   Or generate more sample data:');
    console.log('     node server/scripts/phase9QuickStart.js --create-sample-data');
    return;
  }
  
  if (stats.readyForTraining === 0) {
    console.log('\n⚙️  STEP 2: Process Interactions (Generate Training Labels)');
    console.log('   Run daily batch processing:');
    console.log('     node server/jobs/processInteractions.js');
    console.log('');
    console.log('   This will:');
    console.log('   - Pair impressions with follow-up actions');
    console.log('   - Generate training labels (1=engaged, 0=unengaged)');
    console.log('   - Mark events as ready for training');
    return;
  }
  
  if (stats.readyForTraining < 1000) {
    console.log('\n📊 CURRENT STATUS: Collecting training data...');
    console.log(`   Progress: ${stats.readyForTraining}/1000 labeled examples`);
    console.log('   Recommendation: Collect at least 1000 examples before training');
    console.log('');
    console.log('   Continue using the application or run processing periodically:');
    console.log('     node server/jobs/processInteractions.js');
    return;
  }
  
  console.log('\n✅ SUFFICIENT DATA COLLECTED!');
  console.log('');
  console.log('📦 STEP 3: Generate Training Data');
  console.log('   cd ml-service');
  console.log('   python -m app.training.generate_training_data --days 30 --mark-used');
  console.log('');
  console.log('🎯 STEP 4: Train Initial Model');
  
  if (stats.productionModels === 0) {
    console.log('   (First time - no existing model)');
    console.log('   python -m app.training.retrain_model \\');
    console.log('     --data-file ./data/training/training_data_batch_*.pkl \\');
    console.log('     --epochs 10 \\');
    console.log('     --output-dir ./models');
  } else {
    console.log('   (Transfer learning - continue from existing model)');
    console.log('   python -m app.training.retrain_model \\');
    console.log('     --data-file ./data/training/training_data_batch_*.pkl \\');
    console.log('     --existing-model ./models/ranking_model.h5 \\');
    console.log('     --epochs 5 \\');
    console.log('     --output-dir ./models');
  }
  
  console.log('');
  console.log('🔬 STEP 5: Start A/B Test');
  console.log('   After registering the new model in MongoDB:');
  console.log('   POST /api/learning/ab-test/start');
  console.log('   {');
  console.log('     "modelName": "ranking_model",');
  console.log('     "candidateVersionId": "<your_new_model_id>",');
  console.log('     "trafficPercentage": 10');
  console.log('   }');
  console.log('');
  console.log('📊 STEP 6: Monitor & Promote');
  console.log('   - Run A/B test for 3-7 days');
  console.log('   - Update metrics daily: POST /api/learning/ab-test/update-metrics');
  console.log('   - Evaluate: POST /api/learning/ab-test/evaluate');
  console.log('   - Promote if better: POST /api/learning/ab-test/promote');
  console.log('');
  console.log('📚 For detailed instructions, see: PHASE_9_README.md');
}

async function runQuickStart() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Phase 9: Continuous Learning - Quick Start            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  // Step 1: Connect to database
  const connected = await connectDatabase();
  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Step 2: Check collections
  await checkCollections();
  
  // Step 3: Get current statistics
  const stats = await getStatistics();
  
  // Step 4: Create sample data if requested
  if (shouldCreateSampleData) {
    await createSampleData();
    
    // Refresh statistics
    console.log('\n📊 Updated Statistics After Sample Data Creation:');
    const updatedStats = await getStatistics();
    showNextSteps(updatedStats);
  } else {
    showNextSteps(stats);
  }
  
  // Close connection
  await mongoose.connection.close();
  console.log('\n✅ Quick start complete!');
}

// Run quick start
runQuickStart().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
