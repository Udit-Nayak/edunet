const ModelVersion = require('../models/ModelVersion');
const InteractionEvent = require('../models/InteractionEvent');
const crypto = require('crypto');

/**
 * Phase 9: A/B Testing Service
 * Handles model version assignment and A/B test management
 */
class ABTestingService {
  constructor() {
    this.cache = {
      productionVersions: {},
      candidateVersions: {},
      lastCacheUpdate: 0,
      cacheTTL: 60000 // 1 minute
    };
  }

  /**
   * Get model version for a user (with A/B test logic)
   */
  async getModelVersionForUser(userId, modelName = 'ranking_model') {
    try {
      // Check if there's an active A/B test
      const abTest = await this.getActiveABTest(modelName);

      if (abTest && abTest.abTest.isActive) {
        // Determine if user is in test group
        const isInTestGroup = this.hashUserToTestGroup(
          userId.toString(),
          abTest.abTest.trafficPercentage
        );

        if (isInTestGroup) {
          return {
            version: abTest.versionId,
            modelVersion: abTest.versionNumber,
            isTestGroup: true,
            trafficPercentage: abTest.abTest.trafficPercentage
          };
        }
      }

      // Return production version
      const production = await this.getProductionVersion(modelName);

      return {
        version: production.versionId,
        modelVersion: production.versionNumber,
        isTestGroup: false,
        trafficPercentage: 100 - (abTest?.abTest.trafficPercentage || 0)
      };
    } catch (error) {
      console.error('Error getting model version for user:', error);
      // Fallback to production
      return {
        version: 'production',
        modelVersion: 'v1.0',
        isTestGroup: false,
        trafficPercentage: 100
      };
    }
  }

  /**
   * Hash user ID to determine test group assignment (consistent hashing)
   */
  hashUserToTestGroup(userId, trafficPercentage) {
    // Use MD5 hash of userId to get consistent assignment
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    // Take first 8 characters and convert to number
    const hashNum = parseInt(hash.substring(0, 8), 16);
    // Map to 0-100 range
    const bucket = hashNum % 100;
    
    // User is in test group if bucket < trafficPercentage
    return bucket < trafficPercentage;
  }

  /**
   * Get production model version (with caching)
   */
  async getProductionVersion(modelName) {
    const now = Date.now();
    
    // Check cache
    if (
      this.cache.productionVersions[modelName] &&
      now - this.cache.lastCacheUpdate < this.cache.cacheTTL
    ) {
      return this.cache.productionVersions[modelName];
    }

    // Fetch from database
    const version = await ModelVersion.getCurrentProduction(modelName);
    
    if (!version) {
      throw new Error(`No production version found for ${modelName}`);
    }

    // Update cache
    this.cache.productionVersions[modelName] = version;
    this.cache.lastCacheUpdate = now;

    return version;
  }

  /**
   * Get active A/B test (with caching)
   */
  async getActiveABTest(modelName) {
    const now = Date.now();
    
    // Check cache
    if (
      this.cache.candidateVersions[modelName] &&
      now - this.cache.lastCacheUpdate < this.cache.cacheTTL
    ) {
      return this.cache.candidateVersions[modelName];
    }

    // Fetch from database
    const version = await ModelVersion.getActiveABTest(modelName);
    
    // Update cache
    this.cache.candidateVersions[modelName] = version;
    this.cache.lastCacheUpdate = now;

    return version;
  }

  /**
   * Clear cache (call after updating model versions)
   */
  clearCache() {
    this.cache.productionVersions = {};
    this.cache.candidateVersions = {};
    this.cache.lastCacheUpdate = 0;
  }

  /**
   * Start A/B test for a candidate model
   */
  async startABTest(modelName, candidateVersionId, trafficPercentage = 10) {
    try {
      // Verify no active A/B test exists
      const existingTest = await ModelVersion.getActiveABTest(modelName);
      if (existingTest) {
        throw new Error(`A/B test already active for ${modelName}: ${existingTest.versionId}`);
      }

      // Get candidate version
      const candidate = await ModelVersion.findOne({
        versionId: candidateVersionId,
        modelName,
        status: 'candidate'
      });

      if (!candidate) {
        throw new Error(`Candidate version not found: ${candidateVersionId}`);
      }

      // Start A/B test
      await candidate.startABTest(trafficPercentage);

      // Clear cache
      this.clearCache();

      console.log(`🧪 Started A/B test for ${modelName}: ${candidateVersionId} with ${trafficPercentage}% traffic`);

      return candidate;
    } catch (error) {
      console.error('Error starting A/B test:', error);
      throw error;
    }
  }

  /**
   * Stop A/B test
   */
  async stopABTest(modelName) {
    try {
      const abTest = await ModelVersion.getActiveABTest(modelName);
      
      if (!abTest) {
        throw new Error(`No active A/B test found for ${modelName}`);
      }

      await abTest.endABTest();

      // Clear cache
      this.clearCache();

      console.log(`🛑 Stopped A/B test for ${modelName}: ${abTest.versionId}`);

      return abTest;
    } catch (error) {
      console.error('Error stopping A/B test:', error);
      throw error;
    }
  }

  /**
   * Update A/B test metrics
   */
  async updateABTestMetrics(modelName, days = 1) {
    try {
      const abTest = await ModelVersion.getActiveABTest(modelName);
      
      if (!abTest) {
        console.log(`No active A/B test for ${modelName}`);
        return null;
      }

      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Get events for test version
      const testEvents = await InteractionEvent.find({
        modelVersion: abTest.versionId,
        timestamp: { $gte: cutoffDate }
      }).lean();

      // Calculate metrics
      const metrics = this.calculateMetrics(testEvents);

      // Update A/B test results
      await abTest.updateABTestMetrics(metrics);

      // Get baseline (production) metrics
      const production = await ModelVersion.getCurrentProduction(modelName);
      const productionEvents = await InteractionEvent.find({
        modelVersion: production.versionId,
        timestamp: { $gte: cutoffDate }
      }).lean();

      const baselineMetrics = this.calculateMetrics(productionEvents);

      // Compare with baseline
      await abTest.compareWithBaseline(baselineMetrics);

      console.log(`📊 Updated A/B test metrics for ${modelName}`);
      console.log(`   Test CTR: ${metrics.ctr.toFixed(2)}% vs Baseline: ${baselineMetrics.ctr.toFixed(2)}%`);
      console.log(`   Improvement: ${abTest.comparisonMetrics.ctrImprovement.toFixed(2)}%`);

      return {
        testMetrics: metrics,
        baselineMetrics,
        comparison: abTest.comparisonMetrics
      };
    } catch (error) {
      console.error('Error updating A/B test metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics from events
   */
  calculateMetrics(events) {
    const impressions = events.filter(e => e.eventType === 'impression').length;
    const clicks = events.filter(e => e.eventType === 'click').length;
    const upvotes = events.filter(e => e.eventType === 'upvote').length;
    const saves = events.filter(e => e.eventType === 'save').length;
    const comments = events.filter(e => e.eventType === 'comment').length;

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    
    const engagementActions = clicks + upvotes + saves + comments;
    const engagementRate = impressions > 0 ? (engagementActions / impressions) * 100 : 0;

    // Calculate session metrics
    const sessionMap = {};
    events.forEach(e => {
      if (e.sessionId) {
        if (!sessionMap[e.sessionId]) {
          sessionMap[e.sessionId] = {
            startTime: e.timestamp,
            endTime: e.timestamp,
            postCount: new Set(),
            userId: e.userId
          };
        }
        sessionMap[e.sessionId].endTime = e.timestamp;
        sessionMap[e.sessionId].postCount.add(e.postId.toString());
      }
    });

    const sessions = Object.values(sessionMap);
    let totalSessionTime = 0;
    let totalPostsPerSession = 0;

    sessions.forEach(session => {
      const duration = (session.endTime - session.startTime) / 1000; // seconds
      totalSessionTime += duration;
      totalPostsPerSession += session.postCount.size;
    });

    const avgSessionTime = sessions.length > 0 ? totalSessionTime / sessions.length : 0;
    const avgPostsPerSession = sessions.length > 0 ? totalPostsPerSession / sessions.length : 0;

    const uniqueUsers = new Set(events.map(e => e.userId.toString())).size;

    return {
      impressions,
      clicks,
      ctr,
      avgSessionTime,
      avgPostsPerSession,
      engagementRate,
      upvotes,
      comments,
      saves,
      uniqueUsers,
      retention7Day: 0 // Would calculate from user activity over 7 days
    };
  }

  /**
   * Evaluate if candidate should be promoted
   */
  async evaluatePromotion(modelName) {
    try {
      const abTest = await ModelVersion.getActiveABTest(modelName);
      
      if (!abTest) {
        throw new Error(`No active A/B test for ${modelName}`);
      }

      const comparison = abTest.comparisonMetrics;

      if (!comparison.isStatisticallySignificant) {
        return {
          shouldPromote: false,
          reason: 'Not statistically significant (need more data or larger sample)'
        };
      }

      const targetMetric = abTest.abTest.targetMetric || 'ctr';
      const minImprovement = abTest.abTest.minimumImprovement || 2;

      let improvement = 0;
      switch (targetMetric) {
        case 'ctr':
          improvement = comparison.ctrImprovement;
          break;
        case 'session_time':
          improvement = comparison.sessionTimeImprovement;
          break;
        case 'engagement_rate':
          improvement = comparison.engagementImprovement;
          break;
        case 'retention':
          improvement = comparison.retentionImprovement;
          break;
      }

      const shouldPromote = improvement >= minImprovement;

      return {
        shouldPromote,
        improvement,
        targetMetric,
        minImprovement,
        reason: shouldPromote
          ? `${targetMetric} improved by ${improvement.toFixed(2)}% (>= ${minImprovement}%)`
          : `${targetMetric} improved by ${improvement.toFixed(2)}% (< ${minImprovement}%)`
      };
    } catch (error) {
      console.error('Error evaluating promotion:', error);
      throw error;
    }
  }

  /**
   * Promote candidate to production
   */
  async promoteCandidateToProduction(modelName) {
    try {
      const abTest = await ModelVersion.getActiveABTest(modelName);
      
      if (!abTest) {
        throw new Error(`No active A/B test for ${modelName}`);
      }

      // Evaluate if should promote
      const evaluation = await this.evaluatePromotion(modelName);

      if (!evaluation.shouldPromote) {
        throw new Error(`Cannot promote: ${evaluation.reason}`);
      }

      // Stop A/B test first
      await abTest.endABTest();

      // Promote to production
      await abTest.promoteToProduction(evaluation.reason);

      // Clear cache
      this.clearCache();

      console.log(`🚀 Promoted ${abTest.versionId} to production for ${modelName}`);
      console.log(`   Reason: ${evaluation.reason}`);

      return {
        success: true,
        version: abTest,
        evaluation
      };
    } catch (error) {
      console.error('Error promoting candidate:', error);
      throw error;
    }
  }

  /**
   * Rollback current production to previous version
   */
  async rollbackProduction(modelName, reason) {
    try {
      const production = await ModelVersion.getCurrentProduction(modelName);
      
      if (!production) {
        throw new Error(`No production version found for ${modelName}`);
      }

      await production.rollback (reason);

      // Clear cache
      this.clearCache();

      console.log(`⏪ Rolled back ${production.versionId} for ${modelName}`);
      console.log(`   Reason: ${reason}`);

      return production;
    } catch (error) {
      console.error('Error rolling back production:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ABTestingService();
