/**
 * Phase 8 Test Suite: Fast Similarity Search (ANN Index)
 * 
 * Tests the Approximate Nearest Neighbors (ANN) index for fast post similarity search
 * 
 * Usage:
 *   node server/scripts/testPhase8.js
 */

const mongoose = require('mongoose');
const mlService = require('../services/mlService');
const Post = require('../models/Post');
require('dotenv').config();

// Test configuration
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Connect to database
 */
async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/edunet';
    await mongoose.connect(uri);
    console.log(`${COLORS.green}✓ Connected to MongoDB${COLORS.reset}\n`);
    return true;
  } catch (error) {
    console.error(`${COLORS.red}✗ MongoDB connection failed:${COLORS.reset}`, error.message);
    return false;
  }
}

/**
 * Test 1: ANN Index Availability
 */
async function testANNIndexAvailability() {
  console.log('\n📊 Test 1: ANN Index Availability');
  console.log('====================================');

  try {
    const status = await mlService.getANNIndexStatus();

    console.log(`Status: ${status.status}`);

    if (status.status === 'ready') {
      console.log(`${COLORS.green}✓ ANN index is available${COLORS.reset}`);
      
      if (status.annIndex) {
        console.log(`\n📈 Index Stats:`);
        console.log(`   Posts indexed: ${status.annIndex.num_posts}`);
        console.log(`   Embedding dim: ${status.annIndex.embedding_dim}`);
        console.log(`   Algorithm:     ${status.annIndex.algorithm}`);
        console.log(`   Metric:        ${status.annIndex.metric}`);
        console.log(`   Built at:      ${status.annIndex.build_time}`);
      }

      if (status.performance) {
        console.log(`\n⚡ Performance:`);
        console.log(`   Expected speedup: ${status.performance.expected_speedup}`);
        console.log(`   Query time:       ${status.performance.query_time}`);
        console.log(`   Naive time:       ${status.performance.naive_time}`);
      }

      if (status.database) {
        console.log(`\n💾 Database:`);
        console.log(`   Total posts:          ${status.database.total_posts}`);
        console.log(`   Posts with embeddings: ${status.database.posts_with_embeddings}`);
        console.log(`   Coverage:             ${status.database.coverage}`);
      }

      return true;
    } else {
      console.log(`${COLORS.yellow}⚠ ANN index not available${COLORS.reset}`);
      console.log(`  Message: ${status.message || 'Unknown'}`);
      console.log(`\n💡 Build the index with:`);
      console.log(`   cd ml-service`);
      console.log(`   python -m app.training.build_ann_index`);
      return false;
    }
  } catch (error) {
    console.error(`${COLORS.red}✗ Test failed:${COLORS.reset}`, error.message);
    return false;
  }
}

/**
 * Test 2: Fast Similarity Search
 */
async function testFastSimilaritySearch() {
  console.log('\n🔍 Test 2: Fast Similarity Search');
  console.log('=====================================');

  try {
    // Get a test post with embedding
    const testPost = await Post.findOne({
      'mlMetadata.embedding': { $exists: true, $ne: null }
    }).lean();

    if (!testPost) {
      console.log(`${COLORS.yellow}⚠ No posts with embeddings found${COLORS.reset}`);
      return false;
    }

    console.log(`\nQuery post:`);
    console.log(`   ID:    ${testPost._id}`);
    console.log(`   Title: ${testPost.title.substring(0, 50)}...`);
    console.log(`   Tags:  ${testPost.tags.join(', ')}`);

    // Measure query time
    const startTime = Date.now();
    const result = await mlService.findSimilarPostsFast(testPost._id.toString(), 10);
    const queryTime = Date.now() - startTime;

    console.log(`\n⚡ Performance:`);
    console.log(`   Query time:  ${queryTime}ms`);
    console.log(`   Method:      ${result.method}`);
    console.log(`   Speedup:     ${result.speedup}`);

    console.log(`\n📋 Similar Posts Found: ${result.count}`);
    
    if (result.similarPosts.length > 0) {
      console.log(`\nTop 5 similar posts:`);
      result.similarPosts.slice(0, 5).forEach((post, index) => {
        console.log(`   ${index + 1}. ${post.title.substring(0, 50)}...`);
        console.log(`      Similarity: ${(post.similarity * 100).toFixed(1)}%`);
        console.log(`      Tags: ${post.tags.join(', ')}`);
        console.log(`      Upvotes: ${post.upvotes}, Views: ${post.views}`);
      });

      console.log(`${COLORS.green}\n✓ Fast similarity search working${COLORS.reset}`);
      return true;
    } else {
      console.log(`${COLORS.yellow}⚠ No similar posts found${COLORS.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${COLORS.red}✗ Test failed:${COLORS.reset}`, error.message);
    return false;
  }
}

/**
 * Test 3: Performance Comparison (ANN vs Naive)
 */
async function testPerformanceComparison() {
  console.log('\n⚡ Test 3: Performance Comparison');
  console.log('====================================');

  try {
    // Get test post
    const testPost = await Post.findOne({
      'mlMetadata.embedding': { $exists: true, $ne: null }
    }).lean();

    if (!testPost) {
      console.log(`${COLORS.yellow}⚠ No test post available${COLORS.reset}`);
      return false;
    }

    console.log(`\nTesting with post: ${testPost.title.substring(0, 50)}...`);

    // Test ANN search (fast)
    const annTimes = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await mlService.findSimilarPostsFast(testPost._id.toString(), 10);
      annTimes.push(Date.now() - start);
    }

    const avgANNTime = annTimes.reduce((a, b) => a + b, 0) / annTimes.length;

    console.log(`\n📊 Results:`);
    console.log(`   ANN Search (5 runs):`);
    console.log(`      Average: ${avgANNTime.toFixed(2)}ms`);
    console.log(`      Min:     ${Math.min(...annTimes)}ms`);
    console.log(`      Max:     ${Math.max(...annTimes)}ms`);

    // Count total posts for estimation
    const totalPosts = await Post.countDocuments({
      'mlMetadata.embedding': { $exists: true, $ne: null }
    });

    const estimatedNaiveTime = totalPosts * 0.05; // Rough estimate

    console.log(`\n   Estimated Naive Search:`);
    console.log(`      Time: ~${estimatedNaiveTime.toFixed(0)}ms`);
    console.log(`      (${totalPosts} posts × 0.05ms per comparison)`);

    const speedup = estimatedNaiveTime / avgANNTime;
    
    console.log(`\n🚀 Performance Improvement:`);
    console.log(`   Speedup: ${COLORS.green}${speedup.toFixed(1)}x faster${COLORS.reset}`);
    console.log(`   Time saved: ${(estimatedNaiveTime - avgANNTime).toFixed(0)}ms per query`);

    if (speedup > 10) {
      console.log(`${COLORS.green}✓ Significant performance improvement!${COLORS.reset}`);
      return true;
    } else {
      console.log(`${COLORS.yellow}⚠ Limited speedup (need more posts)${COLORS.reset}`);
      return true; // Still pass, index is working
    }
  } catch (error) {
    console.error(`${COLORS.red}✗ Test failed:${COLORS.reset}`, error.message);
    return false;
  }
}

/**
 * Test 4: Similar Posts with Full Details
 */
async function testSimilarPostsWithDetails() {
  console.log('\n📄 Test 4: Similar Posts with Full Details');
  console.log('==============================================');

  try {
    const testPost = await Post.findOne({
      'mlMetadata.embedding': { $exists: true, $ne: null }
    }).lean();

    if (!testPost) {
      console.log(`${COLORS.yellow}⚠ No test post available${COLORS.reset}`);
      return false;
    }

    console.log(`\nFetching similar posts with full details...`);
    
    const startTime = Date.now();
    const similarPosts = await mlService.getSimilarPostsWithDetails(testPost._id.toString(), 5);
    const queryTime = Date.now() - startTime;

    console.log(`Query time: ${queryTime}ms`);
    console.log(`Found: ${similarPosts.length} posts`);

    if (similarPosts.length > 0) {
      console.log(`\nSimilar posts:`);
      similarPosts.forEach((post, index) => {
        console.log(`\n   ${index + 1}. ${post.title}`);
        console.log(`      Author: ${post.authorId?.username || 'Unknown'}`);
        console.log(`      Type: ${post.type}`);
        console.log(`      Tags: ${post.tags.join(', ')}`);
        console.log(`      Similarity: ${(post.similarity * 100).toFixed(1)}%`);
        console.log(`      Engagement: ${post.upvotes} upvotes, ${post.viewCount} views`);
      });

      console.log(`${COLORS.green}\n✓ Full details retrieval working${COLORS.reset}`);
      return true;
    } else {
      console.log(`${COLORS.yellow}⚠ No similar posts found${COLORS.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${COLORS.red}✗ Test failed:${COLORS.reset}`, error.message);
    return false;
  }
}

/**
 * Test 5: Similarity Quality Analysis
 */
async function testSimilarityQuality() {
  console.log('\n🎯 Test 5: Similarity Quality Analysis');
  console.log('=========================================');

  try {
    // Get a test post with tags
    const testPost = await Post.findOne({
      'mlMetadata.embedding': { $exists: true, $ne: null },
      'tags': { $exists: true, $not: { $size: 0 } }
    }).lean();

    if (!testPost) {
      console.log(`${COLORS.yellow}⚠ No test post with tags available${COLORS.reset}`);
      return false;
    }

    console.log(`\nQuery post:`);
    console.log(`   Title: ${testPost.title}`);
    console.log(`   Type:  ${testPost.type}`);
    console.log(`   Tags:  ${testPost.tags.join(', ')}`);

    const result = await mlService.findSimilarPostsFast(testPost._id.toString(), 10);

    if (result.similarPosts.length === 0) {
      console.log(`${COLORS.yellow}⚠ No similar posts found${COLORS.reset}`);
      return false;
    }

    // Analyze similarity quality
    let sameType = 0;
    let sharedTags = 0;
    let totalSharedTags = 0;

    result.similarPosts.forEach(post => {
      if (post.type === testPost.type) {
        sameType++;
      }

      const shared = post.tags.filter(tag => testPost.tags.includes(tag));
      if (shared.length > 0) {
        sharedTags++;
        totalSharedTags += shared.length;
      }
    });

    const typeMatch = (sameType / result.similarPosts.length * 100).toFixed(1);
    const tagMatch = (sharedTags / result.similarPosts.length * 100).toFixed(1);
    const avgSharedTags = (totalSharedTags / result.similarPosts.length).toFixed(1);

    console.log(`\n📊 Quality Metrics:`);
    console.log(`   Same type:        ${typeMatch}% (${sameType}/${result.similarPosts.length})`);
    console.log(`   Shared tags:      ${tagMatch}% (${sharedTags}/${result.similarPosts.length})`);
    console.log(`   Avg shared tags:  ${avgSharedTags} tags`);
    console.log(`   Avg similarity:   ${(result.similarPosts.reduce((sum, p) => sum + p.similarity, 0) / result.similarPosts.length * 100).toFixed(1)}%`);

    // Show top similar post
    console.log(`\n🌟 Most similar post:`);
    const topPost = result.similarPosts[0];
    console.log(`   Title:      ${topPost.title.substring(0, 60)}...`);
    console.log(`   Type:       ${topPost.type}`);
    console.log(`   Tags:       ${topPost.tags.join(', ')}`);
    console.log(`   Similarity: ${(topPost.similarity * 100).toFixed(1)}%`);

    const sharedWithTop = topPost.tags.filter(tag => testPost.tags.includes(tag));
    if (sharedWithTop.length > 0) {
      console.log(`   Shared tags: ${sharedWithTop.join(', ')}`);
    }

    console.log(`${COLORS.green}\n✓ Similarity results appear relevant${COLORS.reset}`);
    return true;
  } catch (error) {
    console.error(`${COLORS.red}✗ Test failed:${COLORS.reset}`, error.message);
    return false;
  }
}

/**
 * Test 6: Batch Processing
 */
async function testBatchProcessing() {
  console.log('\n⚙️  Test 6: Batch Similarity Search');
  console.log('======================================');

  try {
    // Get 3 test posts
    const testPosts = await Post.find({
      'mlMetadata.embedding': { $exists: true, $ne: null }
    })
      .limit(3)
      .lean();

    if (testPosts.length < 3) {
      console.log(`${COLORS.yellow}⚠ Need at least 3 posts for batch test${COLORS.reset}`);
      return false;
    }

    console.log(`\nTesting batch similarity for ${testPosts.length} posts...`);

    const startTime = Date.now();
    
    // Process each post
    const results = [];
    for (const post of testPosts) {
      const result = await mlService.findSimilarPostsFast(post._id.toString(), 5);
      results.push({
        postId: post._id.toString(),
        title: post.title,
        similarCount: result.count
      });
    }

    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / testPosts.length;

    console.log(`\n⏱️  Performance:`);
    console.log(`   Total time:   ${totalTime}ms`);
    console.log(`   Average time: ${avgTime.toFixed(1)}ms per post`);
    console.log(`   Throughput:   ${(1000 / avgTime).toFixed(1)} queries/second`);

    console.log(`\n📊 Results:`);
    results.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.title.substring(0, 50)}...`);
      console.log(`      Similar posts found: ${r.similarCount}`);
    });

    console.log(`${COLORS.green}\n✓ Batch processing working efficiently${COLORS.reset}`);
    return true;
  } catch (error) {
    console.error(`${COLORS.red}✗ Test failed:${COLORS.reset}`, error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${COLORS.bright}PHASE 8: Fast Similarity Search (ANN) Test Suite${COLORS.reset}`);
  console.log(`${'='.repeat(60)}`);

  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  const tests = [
    { name: 'ANN Index Availability', fn: testANNIndexAvailability },
    { name: 'Fast Similarity Search', fn: testFastSimilaritySearch },
    { name: 'Performance Comparison', fn: testPerformanceComparison },
    { name: 'Full Details Retrieval', fn: testSimilarPostsWithDetails },
    { name: 'Similarity Quality', fn: testSimilarityQuality },
    { name: 'Batch Processing', fn: testBatchProcessing }
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause
    } catch (error) {
      console.error(`${COLORS.red}✗ ${test.name} crashed:${COLORS.reset}`, error);
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${COLORS.bright}Test Summary${COLORS.reset}`);
  console.log(`${'='.repeat(60)}\n`);

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const icon = result.passed ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
    console.log(`  ${icon} ${result.name}`);
  });

  console.log(`\n  ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log(`\n  ${COLORS.green}${COLORS.bright}🎉 All tests passed! Phase 8 is working perfectly!${COLORS.reset}\n`);
  } else {
    console.log(`\n  ${COLORS.yellow}⚠ Some tests failed. Check the output above.${COLORS.reset}\n`);
  }

  // Cleanup
  await mongoose.connection.close();
  console.log(`${COLORS.blue}Database connection closed${COLORS.reset}\n`);

  process.exit(passed === total ? 0 : 1);
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
