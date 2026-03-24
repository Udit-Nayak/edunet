/**
 * Phase 6: Multi-Label Tag Classifier - Test Suite
 * Tests tag suggestion functionality
 */

const axios = require('axios');
const mongoose = require('mongoose');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

// Test data
const testPosts = [
  {
    title: 'How to implement binary search in Python?',
    content: 'I need help implementing a binary search algorithm in Python. What is the most efficient way to do this?'
  },
  {
    title: 'React useEffect vs useLayoutEffect',
    content: 'What is the difference between useEffect and useLayoutEffect in React? When should I use each one?'
  },
  {
    title: 'SQL JOIN types explained',
    content: 'Can someone explain the different types of JOINs in SQL - INNER, LEFT, RIGHT, and OUTER JOIN?'
  }
];

async function testTagClassifierAvailability() {
  console.log('\n📋 Test 1: Tag Classifier Availability');
  console.log('=====================================');
  
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/api/tags/status`);
    
    console.log('✅ Tag classifier status retrieved');
    console.log(`   Available: ${response.data.tag_classifier_available}`);
    console.log(`   Number of tags: ${response.data.num_tags}`);
    
    if (response.data.num_tags > 0) {
      console.log(`   Sample tags: ${response.data.all_tags.slice(0, 5).join(', ')}...`);
    }
    
    if (!response.data.tag_classifier_available) {
      console.log('\n⚠️  Warning: Tag classifier not available');
      console.log('   Train the model with: cd ml-service && python -m app.training.train_tag_classifier');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check tag classifier status');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function testMLServiceTagSuggestion() {
  console.log('\n📋 Test 2: ML Service Tag Suggestion');
  console.log('====================================');
  
  try {
    const text = testPosts[0].title + ' ' + testPosts[0].content;
    
    const response = await axios.post(`${ML_SERVICE_URL}/api/tags/suggest`, {
      text,
      threshold: 0.3,
      top_k: 5
    });
    
    console.log('✅ Tag suggestions retrieved from ML service');
    console.log(`   Input text: "${testPosts[0].title}"`);
    console.log(`   Suggestions count: ${response.data.count}`);
    
    if (response.data.suggestions && response.data.suggestions.length > 0) {
      console.log('   Suggested tags:');
      response.data.suggestions.forEach((s, i) => {
        console.log(`      ${i + 1}. ${s.tag} (confidence: ${(s.confidence * 100).toFixed(1)}%)`);
      });
      return true;
    } else {
      console.log('   No suggestions returned');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 503) {
      console.error('❌ Tag classifier not available');
      return false;
    }
    console.error('❌ Failed to get tag suggestions');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function testServerTagEndpoint() {
  console.log('\n📋 Test 3: Server Tag Endpoint');
  console.log('===============================');
  
  try {
    const text = testPosts[1].title + ' ' + testPosts[1].content;
    
    const response = await axios.post(`${SERVER_URL}/api/tags/suggest`, {
      text,
      threshold: 0.3,
      top_k: 5
    });
    
    console.log('✅ Tag suggestions retrieved from server');
    console.log(`   Input text: "${testPosts[1].title}"`);
    console.log(`   Success: ${response.data.success}`);
    console.log(`   Suggestions count: ${response.data.count}`);
    
    if (response.data.suggestions && response.data.suggestions.length > 0) {
      console.log('   Suggested tags:');
      response.data.suggestions.forEach((s, i) => {
        console.log(`      ${i + 1}. ${s.tag} (${(s.confidence * 100).toFixed(1)}%)`);
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Server tag endpoint failed');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function testMultipleTexts() {
  console.log('\n📋 Test 4: Multiple Text Suggestions');
  console.log('====================================');
  
  try {
    let successCount = 0;
    
    for (let i = 0; i < testPosts.length; i++) {
      const post = testPosts[i];
      const text = post.title + ' ' + post.content;
      
      const response = await axios.post(`${SERVER_URL}/api/tags/suggest`, {
        text,
        threshold: 0.25,
        top_k: 3
      });
      
      console.log(`\n   Test ${i + 1}: "${post.title.substring(0, 40)}..."`);
      console.log(`   Tags: ${response.data.suggestions.map(s => s.tag).join(', ')}`);
      
      if (response.data.count > 0) {
        successCount++;
      }
    }
    
    console.log(`\n✅ Tested ${testPosts.length} texts, ${successCount} had suggestions`);
    return successCount === testPosts.length;
  } catch (error) {
    console.error('❌ Multiple text test failed');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function testThresholdFiltering() {
  console.log('\n📋 Test 5: Threshold Filtering');
  console.log('================================');
  
  try {
    const text = testPosts[0].title + ' ' + testPosts[0].content;
    
    // Low threshold
    const lowResponse = await axios.post(`${ML_SERVICE_URL}/api/tags/suggest`, {
      text,
      threshold: 0.2,
      top_k: 10
    });
    
    // High threshold
    const highResponse = await axios.post(`${ML_SERVICE_URL}/api/tags/suggest`, {
      text,
      threshold: 0.5,
      top_k: 10
    });
    
    console.log(`✅ Threshold filtering working`);
    console.log(`   Low threshold (0.2): ${lowResponse.data.count} suggestions`);
    console.log(`   High threshold (0.5): ${highResponse.data.count} suggestions`);
    
    // High threshold should have fewer or equal suggestions
    const passed = highResponse.data.count <= lowResponse.data.count;
    
    if (passed) {
      console.log('   ✓ Filtering logic correct');
    } else {
      console.log('   ✗ Filtering logic incorrect');
    }
    
    return passed;
  } catch (error) {
    console.error('❌ Threshold filtering test failed');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function testGetAllTags() {
  console.log('\n📋 Test 6: Get All Tags');
  console.log('========================');
  
  try {
    const response = await axios.get(`${SERVER_URL}/api/tags/all`);
    
    console.log('✅ Retrieved all available tags');
    console.log(`   Total tags: ${response.data.count}`);
    
    if (response.data.count > 0) {
      console.log(`   Sample: ${response.data.tags.slice(0, 10).join(', ')}...`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Get all tags failed');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function testEmptyTextHandling() {
  console.log('\n📋 Test 7: Empty Text Handling');
  console.log('===============================');
  
  try {
    // Test with empty string
    await axios.post(`${SERVER_URL}/api/tags/suggest`, {
      text: '',
      threshold: 0.3,
      top_k: 5
    });
    
    console.log('❌ Should have rejected empty text');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Empty text properly rejected with 400 status');
      return true;
    }
    
    console.error('❌ Unexpected error handling empty text');
    return false;
  }
}

async function testDuplicateTagFiltering() {
  console.log('\n📋 Test 8: Duplicate Tag Detection');
  console.log('===================================');
  
  try {
    const text = testPosts[0].title + ' ' + testPosts[0].content;
    
    // Get suggestions
    const response = await axios.post(`${SERVER_URL}/api/tags/suggest`, {
      text,
      threshold: 0.3,
      top_k: 10
    });
    
    const tags = response.data.suggestions.map(s => s.tag);
    const uniqueTags = [...new Set(tags)];
    
    if (tags.length === uniqueTags.length) {
      console.log('✅ No duplicate tags found');
      console.log(`   Total tags: ${tags.length}`);
      return true;
    } else {
      console.log('❌ Duplicate tags detected');
      console.log(`   Total: ${tags.length}, Unique: ${uniqueTags.length}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Duplicate detection test failed');
    console.error(`   Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   PHASE 6: TAG CLASSIFIER TEST SUITE          ║');
  console.log('╚════════════════════════════════════════════════╝');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'Tag Classifier Availability', fn: testTagClassifierAvailability },
    { name: 'ML Service Tag Suggestion', fn: testMLServiceTagSuggestion },
    { name: 'Server Tag Endpoint', fn: testServerTagEndpoint },
    { name: 'Multiple Text Suggestions', fn: testMultipleTexts },
    { name: 'Threshold Filtering', fn: testThresholdFiltering },
    { name: 'Get All Tags', fn: testGetAllTags },
    { name: 'Empty Text Handling', fn: testEmptyTextHandling },
    { name: 'Duplicate Tag Detection', fn: testDuplicateTagFiltering }
  ];
  
  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║              TEST SUMMARY                      ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\nTotal Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`\nSuccess Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Phase 6 is complete.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
  
  console.log('\n');
  
  process.exit(results.failed === 0 ? 0 : 1);
}

// Run tests
if (require.main === module) {
  // Ensure MongoDB connection
  if (!mongoose.connection.readyState) {
    require('dotenv').config();
    const connectDB = require('../config/database');
    
    connectDB().then(() => {
      runAllTests();
    }).catch(err => {
      console.error('Failed to connect to database:', err);
      process.exit(1);
    });
  } else {
    runAllTests();
  }
}

module.exports = { runAllTests };
