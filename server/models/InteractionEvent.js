const mongoose = require('mongoose');

/**
 * Phase 9: Continuous Learning
 * Stores raw user interaction events for model retraining
 */
const interactionEventSchema = new mongoose.Schema({
  // Event identification
  eventId: {
    type: String,
    unique: true,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },

  // User and post
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },

  // Event type
  eventType: {
    type: String,
    enum: [
      'impression',    // Post shown to user
      'click',         // User clicked on post
      'read',          // User spent time reading (>30s)
      'quick_exit',    // User left quickly (<5s)
      'upvote',        // User upvoted
      'downvote',      // User downvoted
      'save',          // User saved post
      'unsave',        // User unsaved post
      'share',         // User shared post
      'comment',       // User commented
      'answer'         // User answered (for questions)
    ],
    required: true,
    index: true
  },

  // Interaction details
  readTime: {
    type: Number, // seconds
    default: 0
  },
  scrollDepth: {
    type: Number, // percentage (0-100)
    default: 0
  },
  
  // Context at time of interaction
  context: {
    source: {
      type: String,
      enum: ['feed', 'search', 'profile', 'similar_posts', 'trending', 'direct', 'detail'],  // Added 'detail'
      default: 'feed'
    },
    position: Number, // Position in list (1-indexed)
    page: Number,
    sortBy: String,
    filterType: String,
    device: {
      type: String,
      enum: ['mobile', 'tablet', 'desktop'],
      default: 'desktop'
    },
    testMode: Boolean  // For testing purposes
  },

  // Model version used for recommendation (if applicable)
  modelVersion: {
    type: String,
    default: 'production'
  },

  // Derived label for training (computed in batch processing)
  trainingLabel: {
    type: Number,
    enum: [-1, 0, 1], // -1: not processed, 0: negative, 1: positive
    default: -1,
    index: true
  },
  
  // Follow-up action (for impression events)
  followUpAction: String,  // Stores the type of follow-up action (click, upvote, etc.)

  // Session tracking
  sessionId: String,

  // User profile snapshot (for training)
  userSnapshot: {
    interests: [String],
    embedding: [Number],
    reputation: Number,
    postCount: Number
  },

  // Post content snapshot (for training)
  postSnapshot: {
    postType: String,  // Changed from 'type' to avoid Mongoose schema conflict
    tags: [String],
    embedding: [Number],
    upvotes: Number,
    viewCount: Number,
    createdAt: Date
  },

  // Timestamps
  timestamp: {
    type: Date,
    default: Date.now
    // Note: index is set below as TTL index with expiration
  },

  // Processing status
  processed: {
    type: Boolean,
    default: false,
    index: true
  },
  processedAt: Date,
  usedForTraining: {
    type: Boolean,
    default: false,
    index: true
  },
  trainingBatch: String

}, {
  timestamps: true
});

// Indexes for efficient queries
interactionEventSchema.index({ userId: 1, timestamp: -1 });
interactionEventSchema.index({ postId: 1, timestamp: -1 });
interactionEventSchema.index({ eventType: 1, timestamp: -1 });
interactionEventSchema.index({ processed: 1, timestamp: -1 });
interactionEventSchema.index({ modelVersion: 1, timestamp: -1 });
interactionEventSchema.index({ 'context.source': 1, timestamp: -1 });
interactionEventSchema.index({ usedForTraining: 1, trainingBatch: 1 });

// Compound index for batch processing
interactionEventSchema.index({ 
  processed: 1, 
  timestamp: -1,
  eventType: 1 
});

// TTL index to auto-delete old events after 90 days (optional)
interactionEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

// Static methods
interactionEventSchema.statics.recordInteraction = async function(data) {
  try {
    const event = new this(data);
    await event.save();
    return event;
  } catch (error) {
    console.error('Error recording interaction:', error);
    return null;
  }
};

interactionEventSchema.statics.getUnprocessedEvents = async function(limit = 10000) {
  return this.find({ processed: false })
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();
};

interactionEventSchema.statics.getEventsForTraining = async function(days = 7) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    timestamp: { $gte: cutoffDate },
    trainingLabel: { $ne: -1 },
    usedForTraining: false
  })
    .sort({ timestamp: 1 })
    .lean();
};

interactionEventSchema.statics.getUserInteractionsRecent = async function(userId, days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({
    userId,
    timestamp: { $gte: cutoffDate }
  })
    .sort({ timestamp: -1 })
    .lean();
};

// Instance methods
interactionEventSchema.methods.computeTrainingLabel = function() {
  // Positive signals (Label = 1)
  const positiveEvents = ['click', 'read', 'upvote', 'save', 'share', 'comment', 'answer'];
  
  // Negative signals (Label = 0)
  const negativeEvents = ['quick_exit', 'downvote'];
  
  // Implicit negative: impression without follow-up action
  // (handled in batch processing)

  if (positiveEvents.includes(this.eventType)) {
    // Additional validation for 'read' event
    if (this.eventType === 'read' && this.readTime < 30) {
      this.trainingLabel = 0; // Read but too short
    } else {
      this.trainingLabel = 1;
    }
  } else if (negativeEvents.includes(this.eventType)) {
    this.trainingLabel = 0;
  } else if (this.eventType === 'impression') {
    // Will be processed in batch - check if followed by engagement
    this.trainingLabel = -1; // Pending
  }

  return this.trainingLabel;
};

const InteractionEvent = mongoose.model('InteractionEvent', interactionEventSchema);

module.exports = InteractionEvent;
