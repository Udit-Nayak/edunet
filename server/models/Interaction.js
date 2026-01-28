const mongoose = require('mongoose');

/**
 * Interaction Model
 * Stores all user-post interactions for ML training
 */
const interactionSchema = new mongoose.Schema(
  {
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

    // Type of interaction
    action: {
      type: String,
      enum: [
        'view',        // User viewed the post
        'click',       // User clicked on post card
        'upvote',      // User upvoted
        'downvote',    // User downvoted
        'save',        // User saved post
        'share',       // User shared post
        'comment',     // User commented
        'answer',      // User answered (for questions)
        'tag_click'    // User clicked a tag
      ],
      required: true,
      index: true
    },

    // Engagement metadata
    metadata: {
      timeSpent: {
        type: Number, // seconds
        default: 0
      },
      scrollDepth: {
        type: Number, // percentage (0-100)
        default: 0
      },
      source: {
        type: String,
        enum: ['feed', 'search', 'profile', 'tag', 'similar', 'notification', 'detail'],
        default: 'feed'
      },
      deviceType: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet'],
        default: 'desktop'
      },
      sessionId: String, // Track user sessions
      clickPosition: Number, // Position in feed (1, 2, 3...)
      tag: String, // For tag_click actions
    },

    // Label for ML training (1 = positive, 0 = negative/neutral)
    label: {
      type: Number,
      enum: [0, 1],
      default: 0
    },

    // For A/B testing
    experimentGroup: {
      type: String,
      default: 'control'
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
interactionSchema.index({ userId: 1, postId: 1, action: 1 });
interactionSchema.index({ createdAt: -1 }); // For time-based queries
interactionSchema.index({ label: 1 }); // For training data queries

// TTL index - automatically delete interactions older than 90 days
interactionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
);

// Method to determine if interaction is positive
interactionSchema.methods.isPositive = function() {
  const positiveActions = ['upvote', 'save', 'share', 'comment', 'answer'];
  const longView = this.action === 'view' && this.metadata.timeSpent > 30;
  
  return positiveActions.includes(this.action) || longView;
};

// Static method to get training data
interactionSchema.statics.getTrainingData = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return await this.find({
    createdAt: { $gte: cutoffDate }
  })
  .populate('userId', 'mlProfile interests')
  .populate('postId', 'mlMetadata tags type')
  .lean();
};

// Static method to calculate engagement rate
interactionSchema.statics.calculateEngagementRate = async function(postId) {
  const stats = await this.aggregate([
    { $match: { postId: new mongoose.Types.ObjectId(postId) } },
    {
      $group: {
        _id: null,
        totalViews: {
          $sum: { $cond: [{ $eq: ['$action', 'view'] }, 1, 0] }
        },
        totalEngagements: {
          $sum: {
            $cond: [
              {
                $in: ['$action', ['upvote', 'save', 'comment', 'answer']]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  if (stats.length === 0 || stats[0].totalViews === 0) {
    return 0;
  }

  return stats[0].totalEngagements / stats[0].totalViews;
};

module.exports = mongoose.model('Interaction', interactionSchema);