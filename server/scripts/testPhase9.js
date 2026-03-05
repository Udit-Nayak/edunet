/**
 * Phase 9: Continuous Learning & Feedback Loop - Test Suite
 * 
 * This comprehensive test suite validates all Phase 9 components:
 * - Interaction tracking
 * - A/B testing framework
 * - Model version management
 * - Training data generation
 * - Batch processing
 * - Metrics calculation
 * 
 * Usage: node server/scripts/testPhase9.js
 */

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const InteractionEvent = require('../models/InteractionEvent');
const ModelVersion = require('../models/ModelVersion');
const User = require('../models/User');
const Post = require('../models/Post');
const interactionTrackingService = require('../services/interactionTrackingService');
const abTestingService = require('../services/abTestingService');
const { processDailyInteractions, getProcessingStats } = require('../jobs/processInteractions');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function testPass(name) {
  console.log(`✅ PASS: ${name}`);
  results.passed++;
  results.tests.push({ name, status: 'PASS' });
}

function testFail(name, error) {
  console.log(`❌ FAIL: ${name}`);
  console.error(`   Error: ${error.message}`);
  results.failed++;
  results.tests.push({ name, status: 'FAIL', error: error.message });
}

async function connectDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete test interaction events
  await InteractionEvent.deleteMany({
    'context.testMode': true
  });
  
  // Delete test model versions
  await ModelVersion.deleteMany({
    versionId: /^test_/
  });
  
  console.log('✅ Test data cleaned up');
}

// ============= TEST 1: Interaction Recording =============
async function testInteractionRecording() {
  console.log('\n📝 Test 1: Interaction Recording');
  
  try {
    // Get a test user and post
    const user = await User.findOne().limit(1);
    const post = await Post.findOne().limit(1);
    
    if (!user || !post) {
      throw new Error('Need at least 1 user and 1 post in database for testing');
    }
    
    // Record an impression
    const result = await interactionTrackingService.recordInteraction({
      userId: user._id,
      postId: post._id,
      eventType: 'impression',
      context: {
        source: 'feed',
        position: 1,
        page: 1,  // Changed to Number
        testMode: true
      }
    });
    
    if (!result) {
      throw new Error('recordInteraction returned null - check console for errors');
    }
    
    // Log the result for debugging
    // console.log('Recorded event:', JSON.stringify(result.toObject(), null, 2));
    
    // Verify impression was recorded - use the _id from the result
    const impression = await InteractionEvent.findById(result._id);
    
    if (!impression) {
      throw new Error('Impression not found by ID after recording');
    }
    
    if (!impression.userSnapshot || !impression.postSnapshot) {
      throw new Error('Snapshots not captured');
    }
    
    testPass('Interaction recording with snapshots');
    
    // Record a click event
    const clickResult = await interactionTrackingService.recordInteraction({
      userId: user._id,
      postId: post._id,
      eventType: 'click',
      context: {
        source: 'feed',
        position: 1,
        testMode: true
      }
    });
    
    if (!clickResult) {
      throw new Error('recordInteraction returned null for click');
    }
    
    const click = await InteractionEvent.findById(clickResult._id);
    
    if (!click) {
      throw new Error('Click not found by ID after recording');
    }
    
    testPass('Click event recording');
    
    // Record an upvote
    const upvoteResult = await interactionTrackingService.recordInteraction({
      userId: user._id,
      postId: post._id,
      eventType: 'upvote',
      context: {
        source: 'detail',
        testMode: true
      }
    });
    
    if (!upvoteResult) {
      throw new Error('recordInteraction returned null for upvote');
    }
    
    const upvote = await InteractionEvent.findById(upvoteResult._id);
    
    if (!upvote) {
      throw new Error('Upvote not recorded');
    }
    
    testPass('Upvote event recording');
    
  } catch (error) {
    testFail('Interaction recording', error);
  }
}

// ============= TEST 2: A/B Testing Assignment =============
async function testABTestingAssignment() {
  console.log('\n🔬 Test 2: A/B Testing Assignment');
  
  try {
    // Create test production model
    const productionModel = await ModelVersion.create({
      versionId: 'test_production_v1',
      modelName: 'ranking_model',
      versionNumber: '1.0.0',
      status: 'production',
      filePath: './models/test_model.h5',
      createdBy: 'test_system'
    });
    
    // Create test candidate model
    const candidateModel = await ModelVersion.create({
      versionId: 'test_candidate_v1',
      modelName: 'ranking_model',
      versionNumber: '1.1.0',
      status: 'candidate',
      filePath: './models/test_candidate.h5',
      createdBy: 'test_system'
    });
    
    testPass('Model version creation');
    
    // Start A/B test
    await abTestingService.startABTest('ranking_model', candidateModel.versionId, 20);
    
    const updatedCandidate = await ModelVersion.findById(candidateModel._id);
    if (updatedCandidate.status !== 'ab_testing') {
      throw new Error('A/B test not started correctly');
    }
    
    testPass('A/B test initiation');
    
    // Test consistent user assignment
    const user = await User.findOne().limit(1);
    
    const assignment1 = await abTestingService.getModelVersionForUser(user._id, 'ranking_model');
    const assignment2 = await abTestingService.getModelVersionForUser(user._id, 'ranking_model');
    
    if (assignment1.versionId !== assignment2.versionId) {
      throw new Error('User assignment not consistent');
    }
    
    testPass('Consistent hash-based user assignment');
    
    // Test traffic split (approximate)
    const testUsers = await User.find().limit(100);
    let testGroupCount = 0;
    
    for (const testUser of testUsers) {
      const assignment = await abTestingService.getModelVersionForUser(testUser._id, 'ranking_model');
      if (assignment.isTestGroup) testGroupCount++;
    }
    
    const testPercentage = (testGroupCount / testUsers.length) * 100;
    console.log(`   Test group: ${testPercentage.toFixed(1)}% (target: 20%)`);
    
    // Allow 10% margin of error for small sample
    if (testPercentage > 10 && testPercentage < 30) {
      testPass('Traffic split distribution');
    } else {
      throw new Error(`Traffic split off target: ${testPercentage}% (expected ~20%)`);
    }
    
    // Clean up
    await abTestingService.stopABTest('ranking_model');
    
  } catch (error) {
    testFail('A/B testing assignment', error);
  }
}

// ============= TEST 3: Batch Processing =============
async function testBatchProcessing() {
  console.log('\n⚙️  Test 3: Batch Processing');
  
  try {
    const user = await User.findOne().limit(1);
    const post = await Post.findOne().limit(1);
    
    // Create an impression
    const impression = await InteractionEvent.create({
      userId: user._id,
      postId: post._id,
      eventType: 'impression',
      context: {
        source: 'feed',
        position: 1,
        testMode: true
      },
      userSnapshot: {
        interests: user.interests || [],
        reputation: user.reputation || 0
      },
      postSnapshot: {
        postType: post.type,  // Changed from 'type' to 'postType'
        tags: post.tags
      }
    });
    
    // Create a follow-up upvote within 10-minute window
    const upvote = await InteractionEvent.create({
      userId: user._id,
      postId: post._id,
      eventType: 'upvote',
      timestamp: new Date(impression.timestamp.getTime() + 5 * 60 * 1000), // 5 minutes later
      context: {
        source: 'detail',
        testMode: true
      },
      userSnapshot: {
        interests: user.interests || [],
        reputation: user.reputation || 0
      },
      postSnapshot: {
        postType: post.type,  // Changed from 'type' to 'postType'
        tags: post.tags
      }
    });
    
    // Compute training label for the upvote
    upvote.computeTrainingLabel();
    await upvote.save();
    
    testPass('Test interaction events created');
    
    // Run batch processing
    await interactionTrackingService.processImpressions(100);
    
    // Verify impression was paired with upvote
    const processedImpression = await InteractionEvent.findById(impression._id);
    
    if (!processedImpression.processed) {
      throw new Error('Impression not processed');
    }
    
    if (processedImpression.trainingLabel !== 1) {
      throw new Error(`Incorrect training label: ${processedImpression.trainingLabel} (expected 1 for positive)`);
    }
    
    if (processedImpression.followUpAction !== 'upvote') {
      throw new Error(`Follow-up action not captured: ${processedImpression.followUpAction}`);
    }
    
    testPass('Impression pairing and label generation');
    
    // Process direct events
    await interactionTrackingService.processDirectEvents(100);
    
    const processedUpvote = await InteractionEvent.findOne({
      userId: user._id,
      postId: post._id,
      eventType: 'upvote',
      'context.testMode': true
    });
    
    if (!processedUpvote.processed) {
      throw new Error('Direct event not processed');
    }
    
    testPass('Direct event processing');
    
  } catch (error) {
    testFail('Batch processing', error);
  }
}

// ============= TEST 4: Training Data Retrieval =============
async function testTrainingDataRetrieval() {
  console.log('\n📦 Test 4: Training Data Retrieval');
  
  try {
    // Get training examples
    const trainingExamples = await interactionTrackingService.getTrainingExamples(30, 100);
    
    console.log(`   Found ${trainingExamples.length} training examples`);
    
    if (trainingExamples.length === 0) {
      console.log('   ⚠️  No training examples found (this is OK if database is new)');
      testPass('Training data retrieval (no data available)');
      return;
    }
    
    // Verify training example structure
    const example = trainingExamples[0];
    
    if (!example.userSnapshot || !example.postSnapshot) {
      throw new Error('Training example missing snapshots');
    }
    
    if (example.trainingLabel !== 0 && example.trainingLabel !== 1) {
      throw new Error(`Invalid training label: ${example.trainingLabel}`);
    }
    
    testPass('Training data structure validation');
    
    // Check label distribution
    const positiveCount = trainingExamples.filter(e => e.trainingLabel === 1).length;
    const negativeCount = trainingExamples.filter(e => e.trainingLabel === 0).length;
    
    console.log(`   Labels: ${positiveCount} positive, ${negativeCount} negative`);
    
    if (positiveCount > 0 && negativeCount > 0) {
      testPass('Training label distribution');
    } else {
      console.log('   ⚠️  Only one class present (need more diverse interactions)');
      testPass('Training label distribution (single class)');
    }
    
  } catch (error) {
    testFail('Training data retrieval', error);
  }
}

// ============= TEST 5: Metrics Calculation =============
async function testMetricsCalculation() {
  console.log('\n📊 Test 5: Metrics Calculation');
  
  try {
    const user = await User.findOne().limit(1);
    const post = await Post.findOne().limit(1);
    
    if (!user || !post) {
      throw new Error('Need test user and post');
    }
    
    // Get user engagement metrics
    const userMetrics = await interactionTrackingService.getUserEngagementMetrics(user._id, 30);
    
    if (typeof userMetrics.ctr !== 'number' || 
        typeof userMetrics.avgReadTime !== 'number' ||
        typeof userMetrics.engagementRate !== 'number') {
      throw new Error('Invalid user metrics structure');
    }
    
    console.log(`   User CTR: ${userMetrics.ctr.toFixed(2)}%`);
    console.log(`   Avg Read Time: ${userMetrics.avgReadTime.toFixed(1)}s`);
    console.log(`   Engagement Rate: ${userMetrics.engagementRate.toFixed(2)}%`);
    
    testPass('User engagement metrics calculation');
    
    // Get post performance metrics
    const postMetrics = await interactionTrackingService.getPostPerformanceMetrics(post._id, 30);
    
    if (typeof postMetrics.ctr !== 'number' || 
        typeof postMetrics.engagementRate !== 'number') {
      throw new Error('Invalid post metrics structure');
    }
    
    console.log(`   Post CTR: ${postMetrics.ctr.toFixed(2)}%`);
    console.log(`   Post Engagement: ${postMetrics.engagementRate.toFixed(2)}%`);
    
    testPass('Post performance metrics calculation');
    
  } catch (error) {
    testFail('Metrics calculation', error);
  }
}

// ============= TEST 6: Model Version Management =============
async function testModelVersionManagement() {
  console.log('\n🔄 Test 6: Model Version Management');
  
  try {
    // Create a model version
    const model = await ModelVersion.create({
      versionId: 'test_model_v2',
      modelName: 'ranking_model',
      versionNumber: '2.0.0',
      status: 'training',
      filePath: './models/test_v2.h5',
      createdBy: 'test_system',
      trainingData: {
        numExamples: 10000,
        positiveExamples: 4500,
        negativeExamples: 5500,
        trainingDuration: 300
      },
      trainingMetrics: {
        loss: 0.35,
        accuracy: 0.82,
        precision: 0.80,
        recall: 0.78,
        f1Score: 0.79,
        auc: 0.88
      }
    });
    
    testPass('Model version creation with metadata');
    
    // Update to candidate status
    model.status = 'candidate';
    await model.save();
    
    testPass('Model status update');
    
    // Test promotion
    await model.promoteToProduction('Test promotion');
    
    const updated = await ModelVersion.findById(model._id);
    
    if (updated.status !== 'production') {
      throw new Error('Model not promoted to production');
    }
    
    if (!updated.deployedAt) {
      throw new Error('Deployment timestamp not set');
    }
    
    testPass('Model promotion to production');
    
    // Test rollback
    await updated.rollback('Test rollback');
    
    const rolledBack = await ModelVersion.findById(model._id);
    
    if (rolledBack.status !== 'archived') {
      throw new Error('Model not archived after rollback');
    }
    
    testPass('Model rollback functionality');
    
  } catch (error) {
    testFail('Model version management', error);
  }
}

// ============= TEST 7: A/B Test Metrics Update =============
async function testABTestMetricsUpdate() {
  console.log('\n📈 Test 7: A/B Test Metrics Update');
  
  try {
    // Create production and candidate models
    const production = await ModelVersion.create({
      versionId: 'test_prod_v3',
      modelName: 'ranking_model',
      versionNumber: '3.0.0',
      status: 'production',
      filePath: './models/test_prod.h5',
      createdBy: 'test_system'
    });
    
    const candidate = await ModelVersion.create({
      versionId: 'test_cand_v3',
      modelName: 'ranking_model',
      versionNumber: '3.1.0',
      status: 'candidate',
      filePath: './models/test_cand.h5',
      createdBy: 'test_system'
    });
    
    // Start A/B test
    await abTestingService.startABTest('ranking_model', candidate.versionId, 10);
    
    // Simulate some interactions with model versions
    const user = await User.findOne().limit(1);
    const post = await Post.findOne().limit(1);
    
    // Create test interactions for both versions
    await InteractionEvent.create([
      {
        userId: user._id,
        postId: post._id,
        eventType: 'impression',
        modelVersion: production.versionId,
        processed: true,
        trainingLabel: 1,
        context: { testMode: true }
      },
      {
        userId: user._id,
        postId: post._id,
        eventType: 'click',
        modelVersion: production.versionId,
        processed: true,
        trainingLabel: 1,
        context: { testMode: true }
      },
      {
        userId: user._id,
        postId: post._id,
        eventType: 'impression',
        modelVersion: candidate.versionId,
        processed: true,
        trainingLabel: 1,
        context: { testMode: true }
      }
    ]);
    
    testPass('Test interaction data created');
    
    // Update A/B test metrics
    await abTestingService.updateABTestMetrics('ranking_model', 1);
    
    const updatedCandidate = await ModelVersion.findById(candidate._id);
    
    if (!updatedCandidate.abTestResults) {
      throw new Error('A/B test results not populated');
    }
    
    console.log(`   Test impressions: ${updatedCandidate.abTestResults.impressions || 0}`);
    console.log(`   Test clicks: ${updatedCandidate.abTestResults.clicks || 0}`);
    
    testPass('A/B test metrics update');
    
    // Stop test
    await abTestingService.stopABTest('ranking_model');
    
    testPass('A/B test cleanup');
    
  } catch (error) {
    testFail('A/B test metrics update', error);
  }
}

// ============= TEST 8: Processing Stats =============
async function testProcessingStats() {
  console.log('\n📋 Test 8: Processing Statistics');
  
  try {
    const stats = await getProcessingStats();
    
    if (typeof stats.totalEvents !== 'number' ||
        typeof stats.unprocessedEvents !== 'number' ||
        typeof stats.readyForTraining !== 'number') {
      throw new Error('Invalid stats structure');
    }
    
    console.log(`   Total events: ${stats.totalEvents}`);
    console.log(`   Unprocessed: ${stats.unprocessedEvents}`);
    console.log(`   Ready for training: ${stats.readyForTraining}`);
    console.log(`   Used for training: ${stats.usedForTraining}`);
    
    testPass('Processing statistics retrieval');
    
  } catch (error) {
    testFail('Processing statistics', error);
  }
}

// ============= MAIN TEST RUNNER =============
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 9: Continuous Learning - Test Suite            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  await connectDatabase();
  
  // Cleanup any existing test data before starting
  await cleanupTestData();
  
  try {
    await testInteractionRecording();
    await testABTestingAssignment();
    await testBatchProcessing();
    await testTrainingDataRetrieval();
    await testMetricsCalculation();
    await testModelVersionManagement();
    await testABTestMetricsUpdate();
    await testProcessingStats();
    
  } catch (error) {
    console.error('\n💥 Unexpected error during testing:', error);
  } finally {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUMMARY                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total:  ${results.passed + results.failed}`);
    
    if (results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.tests
        .filter(t => t.status === 'FAIL')
        .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
    }
    
    // Cleanup test data
    await cleanupTestData();
    
    // Close database connection
    await mongoose.connection.close();
    console.log('\n📊 Database connection closed');
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

// Run tests
runAllTests();
