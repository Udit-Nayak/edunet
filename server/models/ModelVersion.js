const mongoose = require('mongoose');

/**
 * Phase 9: Model Version Tracking
 * Tracks different versions of ML models and A/B test results
 */
const modelVersionSchema = new mongoose.Schema({
  // Version identification
  versionId: {
    type: String,
    unique: true,
    required: true
  },
  modelName: {
    type: String,
    required: true,
    enum: ['ranking_model', 'collaborative_filter', 'embedding_model'],
    index: true
  },

  // Version details
  versionNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['training', 'candidate', 'ab_testing', 'production', 'archived'],
    default: 'training',
    index: true
  },

  // Model metadata
  filePath: {
    type: String,
    required: true
  },
  modelSize: Number, // bytes
  architecture: String,
  hyperparameters: mongoose.Schema.Types.Mixed,

  // Training information
  trainingData: {
    startDate: Date,
    endDate: Date,
    numExamples: Number,
    positiveExamples: Number,
    negativeExamples: Number,
    trainingDuration: Number, // seconds
    batchId: String
  },

  // Performance metrics (from training)
  trainingMetrics: {
    loss: Number,
    accuracy: Number,
    precision: Number,
    recall: Number,
    f1Score: Number,
    auc: Number,
    validationLoss: Number,
    validationAccuracy: Number
  },

  // A/B test configuration
  abTest: {
    isActive: {
      type: Boolean,
      default: false
    },
    trafficPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    startDate: Date,
    endDate: Date,
    targetMetric: {
      type: String,
      enum: ['ctr', 'session_time', 'engagement_rate', 'retention'],
      default: 'ctr'
    },
    minimumImprovement: {
      type: Number,
      default: 2 // minimum 2% improvement to promote
    }
  },

  // A/B test results
  abTestResults: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    
    avgSessionTime: { type: Number, default: 0 },
    avgPostsPerSession: { type: Number, default: 0 },
    
    engagementRate: { type: Number, default: 0 },
    upvotes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    
    uniqueUsers: { type: Number, default: 0 },
    retention7Day: { type: Number, default: 0 },
    
    lastUpdated: Date
  },

  // Comparison with baseline (production model)
  comparisonMetrics: {
    ctrImprovement: Number, // percentage
    sessionTimeImprovement: Number,
    engagementImprovement: Number,
    retentionImprovement: Number,
    isStatisticallySignificant: Boolean,
    pValue: Number
  },

  // Deployment information
  deployedAt: Date,
  deployedBy: String,
  promotionReason: String,

  // Rollback information
  replacedVersionId: String,
  isRolledBack: {
    type: Boolean,
    default: false
  },
  rollbackReason: String,

  // Notes and changelog
  notes: String,
  changelog: [String],

  // Metadata
  createdBy: {
    type: String,
    default: 'system'
  }

}, {
  timestamps: true
});

// Indexes
modelVersionSchema.index({ modelName: 1, status: 1 });
modelVersionSchema.index({ 'abTest.isActive': 1 });
modelVersionSchema.index({ versionNumber: -1 });
modelVersionSchema.index({ createdAt: -1 });

// Static methods
modelVersionSchema.statics.getCurrentProduction = async function(modelName) {
  return this.findOne({
    modelName,
    status: 'production'
  }).sort({ deployedAt: -1 });
};

modelVersionSchema.statics.getCurrentCandidate = async function(modelName) {
  return this.findOne({
    modelName,
    status: 'candidate'
  }).sort({ createdAt: -1 });
};

modelVersionSchema.statics.getActiveABTest = async function(modelName) {
  return this.findOne({
    modelName,
    status: 'ab_testing',
    'abTest.isActive': true
  });
};

modelVersionSchema.statics.createNewVersion = async function(data) {
  const versionId = `${data.modelName}_v${data.versionNumber}_${Date.now()}`;
  
  const version = new this({
    ...data,
    versionId,
    status: 'candidate'
  });

  await version.save();
  return version;
};

// Instance methods
modelVersionSchema.methods.startABTest = async function(trafficPercentage = 10) {
  this.status = 'ab_testing';
  this.abTest.isActive = true;
  this.abTest.trafficPercentage = trafficPercentage;
  this.abTest.startDate = new Date();
  
  await this.save();
  return this;
};

modelVersionSchema.methods.endABTest = async function() {
  this.abTest.isActive = false;
  this.abTest.endDate = new Date();
  
  await this.save();
  return this;
};

modelVersionSchema.methods.promoteToProduction = async function(reason) {
  // Archive old production version
  const oldProduction = await this.constructor.findOne({
    modelName: this.modelName,
    status: 'production'
  });

  if (oldProduction) {
    oldProduction.status = 'archived';
    await oldProduction.save();
  }

  // Promote this version
  this.status = 'production';
  this.deployedAt = new Date();
  this.promotionReason = reason;
  if (oldProduction) {
    this.replacedVersionId = oldProduction.versionId;
  }

  await this.save();
  return this;
};

modelVersionSchema.methods.rollback = async function(reason) {
  // Mark as rolled back
  this.isRolledBack = true;
  this.rollbackReason = reason;
  this.status = 'archived';
  
  // Restore previous version
  if (this.replacedVersionId) {
    const previousVersion = await this.constructor.findOne({
      versionId: this.replacedVersionId
    });
    
    if (previousVersion) {
      previousVersion.status = 'production';
      previousVersion.deployedAt = new Date();
      await previousVersion.save();
    }
  }

  await this.save();
  return this;
};

modelVersionSchema.methods.updateABTestMetrics = async function(metrics) {
  Object.assign(this.abTestResults, metrics);
  this.abTestResults.lastUpdated = new Date();
  
  // Calculate CTR
  if (this.abTestResults.impressions > 0) {
    this.abTestResults.ctr = (this.abTestResults.clicks / this.abTestResults.impressions) * 100;
  }
  
  await this.save();
  return this;
};

modelVersionSchema.methods.compareWithBaseline = async function(baselineMetrics) {
  const baseline = baselineMetrics;
  const current = this.abTestResults;

  this.comparisonMetrics = {
    ctrImprovement: baseline.ctr > 0 
      ? ((current.ctr - baseline.ctr) / baseline.ctr) * 100 
      : 0,
    sessionTimeImprovement: baseline.avgSessionTime > 0
      ? ((current.avgSessionTime - baseline.avgSessionTime) / baseline.avgSessionTime) * 100
      : 0,
    engagementImprovement: baseline.engagementRate > 0
      ? ((current.engagementRate - baseline.engagementRate) / baseline.engagementRate) * 100
      : 0,
    retentionImprovement: baseline.retention7Day > 0
      ? ((current.retention7Day - baseline.retention7Day) / baseline.retention7Day) * 100
      : 0
  };

  // Simple statistical significance check (would use proper test in production)
  const minSampleSize = 1000;
  this.comparisonMetrics.isStatisticallySignificant = 
    current.impressions >= minSampleSize && 
    Math.abs(this.comparisonMetrics.ctrImprovement) >= this.abTest.minimumImprovement;

  await this.save();
  return this.comparisonMetrics;
};

const ModelVersion = mongoose.model('ModelVersion', modelVersionSchema);

module.exports = ModelVersion;
