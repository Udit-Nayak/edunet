const interactionTrackingService = require('../services/interactionTrackingService');
const abTestingService = require('../services/abTestingService');
const ModelVersion = require('../models/ModelVersion');
const InteractionEvent = require('../models/InteractionEvent');

/**
 * Phase 9: Learning Controller
 * Handles continuous learning and A/B testing endpoints
 */

// ========================================
// Interaction Tracking
// ========================================

exports.recordInteraction = async (req, res) => {
  try {
    const {
      postId,
      eventType,
      readTime,
      scrollDepth,
      context,
      sessionId
    } = req.body;

    const userId = req.user._id;

    // Get model version for user (A/B test assignment)
    const modelInfo = await abTestingService.getModelVersionForUser(userId);

    const event = await interactionTrackingService.recordInteraction({
      userId,
      postId,
      eventType,
      readTime,
      scrollDepth,
      context,
      sessionId,
      modelVersion: modelInfo.version
    });

    res.status(201).json({
      success: true,
      eventId: event?.eventId,
      modelVersion: modelInfo.version,
      isTestGroup: modelInfo.isTestGroup
    });

  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording interaction',
      error: error.message
    });
  }
};

exports.recordBatchInteractions = async (req, res) => {
  try {
    const { interactions } = req.body;
    const userId = req.user._id;

    // Get model version for user
    const modelInfo = await abTestingService.getModelVersionForUser(userId);

    // Add userId and modelVersion to each interaction
    const enrichedInteractions = interactions.map(interaction => ({
      ...interaction,
      userId,
      modelVersion: modelInfo.version
    }));

    const result = await interactionTrackingService.recordBatchInteractions(
      enrichedInteractions
    );

    res.status(201).json({
      success: true,
      ...result,
      modelVersion: modelInfo.version
    });

  } catch (error) {
    console.error('Error recording batch interactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error recording batch interactions',
      error: error.message
    });
  }
};

exports.getUserEngagementMetrics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { days = 7 } = req.query;

    const metrics = await interactionTrackingService.getUserEngagementMetrics(
      userId,
      parseInt(days)
    );

    res.status(200).json({
      success: true,
      metrics,
      period: `Last ${days} days`
    });

  } catch (error) {
    console.error('Error getting user engagement metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting engagement metrics',
      error: error.message
    });
  }
};

exports.getPostPerformanceMetrics = async (req, res) => {
  try {
    const { postId } = req.params;
    const { days = 7 } = req.query;

    const metrics = await interactionTrackingService.getPostPerformanceMetrics(
      postId,
      parseInt(days)
    );

    res.status(200).json({
      success: true,
      metrics,
      period: `Last ${days} days`
    });

  } catch(error) {
    console.error('Error getting post performance metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting post metrics',
      error: error.message
    });
  }
};

// ========================================
// A/B Testing
// ========================================

exports.getModelVersionForUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { modelName = 'ranking_model' } = req.query;

    const modelInfo = await abTestingService.getModelVersionForUser(userId, modelName);

    res.status(200).json({
      success: true,
      ...modelInfo
    });

  } catch (error) {
    console.error('Error getting model version:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting model version',
      error: error.message
    });
  }
};

exports.startABTest = async (req, res) => {
  try {
    const { modelName, candidateVersionId, trafficPercentage = 10 } = req.body;

    const abTest = await abTestingService.startABTest(
      modelName,
      candidateVersionId,
      trafficPercentage
    );

    res.status(200).json({
      success: true,
      abTest: {
        versionId: abTest.versionId,
        modelName: abTest.modelName,
        trafficPercentage: abTest.abTest.trafficPercentage,
        startDate: abTest.abTest.startDate
      },
      message: `A/B test started with ${trafficPercentage}% traffic`
    });

  } catch (error) {
    console.error('Error starting A/B test:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting A/B test',
      error: error.message
    });
  }
};

exports.stopABTest = async (req, res) => {
  try {
    const { modelName } = req.body;

    const abTest = await abTestingService.stopABTest(modelName);

    res.status(200).json({
      success: true,
      versionId: abTest.versionId,
      results: abTest.abTestResults,
      comparison: abTest.comparisonMetrics,
      message: 'A/B test stopped'
    });

  } catch (error) {
    console.error('Error stopping A/B test:', error);
    res.status(500).json({
      success: false,
      message: 'Error stopping A/B test',
      error: error.message
    });
  }
};

exports.getABTestStatus = async (req, res) => {
  try {
    const { modelName = 'ranking_model' } = req.query;

    const abTest = await ModelVersion.getActiveABTest(modelName);

    if (!abTest) {
      return res.status(200).json({
        success: true,
        active: false,
        message: 'No active A/B test'
      });
    }

    res.status(200).json({
      success: true,
      active: true,
      abTest: {
        versionId: abTest.versionId,
        versionNumber: abTest.versionNumber,
        modelName: abTest.modelName,
        trafficPercentage: abTest.abTest.trafficPercentage,
        startDate: abTest.abTest.startDate,
        targetMetric: abTest.abTest.targetMetric,
        results: abTest.abTestResults,
        comparison: abTest.comparisonMetrics
      }
    });

  } catch (error) {
    console.error('Error getting A/B test status:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting A/B test status',
      error: error.message
    });
  }
};

exports.updateABTestMetrics = async (req, res) => {
  try {
    const { modelName, days = 1 } = req.body;

    const result = await abTestingService.updateABTestMetrics(modelName, days);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No active A/B test found'
      });
    }

    res.status(200).json({
      success: true,
      testMetrics: result.testMetrics,
      baselineMetrics: result.baselineMetrics,
      comparison: result.comparison,
      message: 'Metrics updated'
    });

  } catch (error) {
    console.error('Error updating A/B test metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating metrics',
      error: error.message
    });
  }
};

exports.evaluatePromotion = async (req, res) => {
  try {
    const { modelName } = req.body;

    const evaluation = await abTestingService.evaluatePromotion(modelName);

    res.status(200).json({
      success: true,
      ...evaluation
    });

  } catch (error) {
    console.error('Error evaluating promotion:', error);
    res.status(500).json({
      success: false,
      message: 'Error evaluating promotion',
      error: error.message
    });
  }
};

exports.promoteToProduction = async (req, res) => {
  try {
    const { modelName } = req.body;

    const result = await abTestingService.promoteCandidateToProduction(modelName);

    res.status(200).json({
      success: true,
      versionId: result.version.versionId,
      evaluation: result.evaluation,
      message: 'Model promoted to production'
    });

  } catch (error) {
    console.error('Error promoting to production:', error);
    res.status(500).json({
      success: false,
      message: 'Error promoting model',
      error: error.message
    });
  }
};

// ========================================
// Model Version Management
// ========================================

exports.listModelVersions = async (req, res) => {
  try {
    const { modelName, status, limit = 20 } = req.query;

    const query = {};
    if (modelName) query.modelName = modelName;
    if (status) query.status = status;

    const versions = await ModelVersion.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      versions,
      count: versions.length
    });

  } catch (error) {
    console.error('Error listing model versions:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing versions',
      error: error.message
    });
  }
};

exports.getModelVersion = async (req, res) => {
  try {
    const { versionId } = req.params;

    const version = await ModelVersion.findOne({ versionId }).lean();

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Model version not found'
      });
    }

    res.status(200).json({
      success: true,
      version
    });

  } catch (error) {
    console.error('Error getting model version:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting version',
      error: error.message
    });
  }
};

// ========================================
// Training Data & Stats
// ========================================

exports.getTrainingDataStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [total, positive, negative, unprocessed, readyForTraining, used] = await Promise.all([
      InteractionEvent.countDocuments({ timestamp: { $gte: cutoffDate } }),
      InteractionEvent.countDocuments({
        timestamp: { $gte: cutoffDate },
        trainingLabel: 1,
        processed: true
      }),
      InteractionEvent.countDocuments({
        timestamp: { $gte: cutoffDate },
        trainingLabel: 0,
        processed: true
      }),
      InteractionEvent.countDocuments({
        timestamp: { $gte: cutoffDate },
        processed: false
      }),
      InteractionEvent.countDocuments({
        timestamp: { $gte: cutoffDate },
        trainingLabel: { $in: [0, 1] },
        processed: true,
        usedForTraining: false
      }),
      InteractionEvent.countDocuments({
        timestamp: { $gte: cutoffDate },
        usedForTraining: true
      })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        period: `Last ${days} days`,
        total,
        positive,
        negative,
        unprocessed,
        readyForTraining,
        usedForTraining: used,
        positiveRatio: positive > 0 ? (positive / (positive + negative)) * 100 : 0
      }
    });

  } catch (error) {
    console.error('Error getting training data stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting stats',
      error: error.message
    });
  }
};

module.exports = exports;
