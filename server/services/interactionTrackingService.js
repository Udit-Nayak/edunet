const InteractionEvent = require('../models/InteractionEvent');
const User = require('../models/User');
const Post = require('../models/Post');

/**
 * Phase 9: Interaction Tracking Service
 * Handles recording and processing of user interactions for continuous learning
 */
class InteractionTrackingService {
  /**
   * Record a user interaction event
   */
  async recordInteraction(data) {
    try {
      const {
        userId,
        postId,
        eventType,
        readTime = 0,
        scrollDepth = 0,
        context = {},
        sessionId = null,
        modelVersion = 'production'
      } = data;

      // Validate required fields
      if (!userId || !postId || !eventType) {
        throw new Error('userId, postId, and eventType are required');
      }

      // Fetch user and post snapshots for training
      const [user, post] = await Promise.all([
        User.findById(userId).select('interests mlProfile reputation').lean(),
        Post.findById(postId).select('type tags mlMetadata upvotes viewCount createdAt').lean()
      ]);

      if (!user || !post) {
        return null; // Silently fail if user/post not found
      }

      // Create user snapshot
      const userSnapshot = {
        interests: user.interests || [],
        embedding: user.mlProfile?.embedding || [],
        reputation: user.reputation || 0,
        postCount: user.postCount || 0
      };

      // Create post snapshot
      const postSnapshot = {
        postType: post.type,  // Changed from 'type' to match schema
        tags: post.tags || [],
        embedding: post.mlMetadata?.embedding || [],
        upvotes: post.upvotes || 0,
        viewCount: post.viewCount || 0,
        createdAt: post.createdAt
      };

      // Create interaction event
      const event = await InteractionEvent.create({
        userId,
        postId,
        eventType,
        readTime,
        scrollDepth,
        context: {
          source: context.source || 'feed',
          position: context.position,
          page: context.page,
          sortBy: context.sortBy,
          filterType: context.filterType,
          device: context.device || this.detectDevice(context.userAgent)
        },
        modelVersion,
        sessionId,
        userSnapshot,
        postSnapshot,
        timestamp: new Date()
      });

      // Compute initial training label
      event.computeTrainingLabel();
      await event.save();

      return event;
    } catch (error) {
      console.error('Error recording interaction:', error);
      return null;
    }
  }

  /**
   * Record multiple interactions in batch
   */
  async recordBatchInteractions(interactions) {
    const results = await Promise.allSettled(
      interactions.map(data => this.recordInteraction(data))
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;

    return { successful, failed, total: results.length };
  }

  /**
   * Process unprocessed impression events
   * Pairs impressions with follow-up actions to create training examples
   */
  async processImpressions(batchSize = 5000) {
    try {
      console.log('🔄 Processing impression events...');

      // Get unprocessed impression events
      const impressions = await InteractionEvent.find({
        eventType: 'impression',
        processed: false
      })
        .sort({ timestamp: 1 })
        .limit(batchSize)
        .lean();

      if (impressions.length === 0) {
        console.log('✅ No unprocessed impressions found');
        return { processed: 0, positive: 0, negative: 0 };
      }

      let positiveCount = 0;
      let negativeCount = 0;

      // Process each impression
      for (const impression of impressions) {
        // Look for follow-up actions within 10 minutes
        const followUpWindow = new Date(impression.timestamp.getTime() + 10 * 60 * 1000);

        const followUpActions = await InteractionEvent.find({
          userId: impression.userId,
          postId: impression.postId,
          timestamp: {
            $gt: impression.timestamp,
            $lte: followUpWindow
          },
          eventType: { $ne: 'impression' }
        }).lean();

        // Determine label based on follow-up actions
        let trainingLabel = 0; // Default to negative (shown but not engaged)
        let followUpAction = null;

        if (followUpActions.length > 0) {
          // Check for positive signals
          const positiveActions = followUpActions.filter(action =>
            ['click', 'read', 'upvote', 'save', 'share', 'comment', 'answer'].includes(action.eventType)
          );

          if (positiveActions.length > 0) {
            trainingLabel = 1;
            followUpAction = positiveActions[0].eventType;  // Store the first positive action
            positiveCount++;
          } else {
            negativeCount++;
          }
        } else {
          negativeCount++;
        }

        // Update impression event
        await InteractionEvent.updateOne(
          { _id: impression._id },
          {
            $set: {
              trainingLabel,
              followUpAction,
              processed: true,
              processedAt: new Date()
            }
          }
        );
      }

      console.log(`✅ Processed ${impressions.length} impressions: ${positiveCount} positive, ${negativeCount} negative`);

      return {
        processed: impressions.length,
        positive: positiveCount,
        negative: negativeCount
      };
    } catch (error) {
      console.error('Error processing impressions:', error);
      throw error;
    }
  }

  /**
   * Mark non-impression events as processed
   */
  async processDirectEvents(batchSize = 5000) {
    try {
      const directEvents = await InteractionEvent.find({
        eventType: { $ne: 'impression' },
        processed: false,
        trainingLabel: { $ne: -1 }
      })
        .limit(batchSize)
        .lean();

      if (directEvents.length === 0) {
        return 0;
      }

      const eventIds = directEvents.map(e => e._id);

      await InteractionEvent.updateMany(
        { _id: { $in: eventIds } },
        {
          $set: {
            processed: true,
            processedAt: new Date()
          }
        }
      );

      return directEvents.length;
    } catch (error) {
      console.error('Error processing direct events:', error);
      throw error;
    }
  }

  /**
   * Get training examples for model retraining
   */
  async getTrainingExamples(days = 7, limit = 50000) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const trainingEvents = await InteractionEvent.find({
        timestamp: { $gte: cutoffDate },
        trainingLabel: { $in: [0, 1] },
        processed: true,
        usedForTraining: false,
        'userSnapshot.embedding.0': { $exists: true },
        'postSnapshot.embedding.0': { $exists: true }
      })
        .sort({ timestamp: 1 })
        .limit(limit)
        .lean();

      console.log(`📊 Retrieved ${trainingEvents.length} training examples from last ${days} days`);

      return trainingEvents;
    } catch (error) {
      console.error('Error getting training examples:', error);
      throw error;
    }
  }

  /**
   * Mark events as used for training
   */
  async markEventsAsUsedForTraining(eventIds, batchId) {
    try {
      await InteractionEvent.updateMany(
        { _id: { $in: eventIds } },
        {
          $set: {
            usedForTraining: true,
            trainingBatch: batchId
          }
        }
      );

      return eventIds.length;
    } catch (error) {
      console.error('Error marking events as used:', error);
      throw error;
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId, days = 7) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 *1000);

      const events = await InteractionEvent.find({
        userId,
        timestamp: { $gte: cutoffDate }
      }).lean();

      const metrics = {
        totalInteractions: events.length,
        impressions: events.filter(e => e.eventType === 'impression').length,
        clicks: events.filter(e => e.eventType === 'click').length,
        reads: events.filter(e => e.eventType === 'read').length,
        upvotes: events.filter(e => e.eventType === 'upvote').length,
        saves: events.filter(e => e.eventType === 'save').length,
        comments: events.filter(e => e.eventType === 'comment').length,
        shares: events.filter(e => e.eventType === 'share').length,
        ctr: 0,
        avgReadTime: 0,
        engagementRate: 0
      };

      if (metrics.impressions > 0) {
        metrics.ctr = (metrics.clicks / metrics.impressions) * 100;
      }

      const readEvents = events.filter(e => e.eventType === 'read' && e.readTime > 0);
      if (readEvents.length > 0) {
        metrics.avgReadTime = readEvents.reduce((sum, e) => sum + e.readTime, 0) / readEvents.length;
      }

      const engagementActions = metrics.clicks + metrics.upvotes + metrics.saves + metrics.comments + metrics.shares;
      if (metrics.impressions > 0) {
        metrics.engagementRate = (engagementActions / metrics.impressions) * 100;
      }

      return metrics;
    } catch (error) {
      console.error('Error getting user engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Get post performance metrics
   */
  async getPostPerformanceMetrics(postId, days = 7) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const events = await InteractionEvent.find({
        postId,
        timestamp: { $gte: cutoffDate }
      }).lean();

      const metrics = {
        impressions: events.filter(e => e.eventType === 'impression').length,
        clicks: events.filter(e => e.eventType === 'click').length,
        reads: events.filter(e => e.eventType === 'read').length,
        upvotes: events.filter(e => e.eventType === 'upvote').length,
        downvotes: events.filter(e => e.eventType === 'downvote').length,
        saves: events.filter(e => e.eventType === 'save').length,
        comments: events.filter(e => e.eventType === 'comment').length,
        shares: events.filter(e => e.eventType === 'share').length,
        ctr: 0,
        engagementRate: 0,
        avgPosition: 0
      };

      if (metrics.impressions > 0) {
        metrics.ctr = (metrics.clicks / metrics.impressions) * 100;
        
        const engagementActions = metrics.clicks + metrics.upvotes + metrics.saves + metrics.comments + metrics.shares;
        metrics.engagementRate = (engagementActions / metrics.impressions) * 100;

        const positionEvents = events.filter(e => e.context?.position);
        if (positionEvents.length > 0) {
          metrics.avgPosition = positionEvents.reduce((sum, e) => sum + e.context.position, 0) / positionEvents.length;
        }
      }

      return metrics;
    } catch (error) {
      console.error('Error getting post performance metrics:', error);
      throw error;
    }
  }

  /**
   * Detect device type from user agent
   */
  detectDevice(userAgent) {
    if (!userAgent) return 'desktop';

    userAgent = userAgent.toLowerCase();
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(userAgent)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  /**
   * Clean up old processed events (optional maintenance task)
   */
  async cleanupOldEvents(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await InteractionEvent.deleteMany({
        timestamp: { $lt: cutoffDate },
        usedForTraining: true
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old interaction events`);

      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old events:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new InteractionTrackingService();
