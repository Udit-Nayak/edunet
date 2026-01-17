const User = require('../models/User');

class ReputationService {
  // Reputation points for different actions
  POINTS = {
    ANSWER_ACCEPTED: 8,
    ANSWER_UPVOTED: 2,
    ANSWER_DOWNVOTED: -2,
    POST_SHARED: 3,
    DAILY_ACTIVE: 2,
    STREAK_7_DAYS: 15,
    STREAK_30_DAYS: 50,
    STREAK_100_DAYS: 100,
    MILESTONE_10_POSTS: 25,
    MILESTONE_50_POSTS: 50,
    MILESTONE_100_POSTS: 75,
    BACK_AFTER_7_DAYS: 5,
    BACK_AFTER_30_DAYS: 10,
  };

  /**
   * Award points for accepted answer
   */
  async awardAcceptedAnswer(userId) {
    return await this.addReputation(userId, this.POINTS.ANSWER_ACCEPTED, 'Answer accepted');
  }

  /**
   * Award points for upvoted answer
   */
  async awardAnswerUpvote(userId) {
    return await this.addReputation(userId, this.POINTS.ANSWER_UPVOTED, 'Answer upvoted');
  }

  /**
   * Remove points for downvoted answer
   */
  async penalizeAnswerDownvote(userId) {
    return await this.addReputation(userId, this.POINTS.ANSWER_DOWNVOTED, 'Answer downvoted');
  }

  /**
   * Award points for post shared
   */
  async awardPostShared(userId) {
    return await this.addReputation(userId, this.POINTS.POST_SHARED, 'Post shared');
  }

  /**
   * Check and award daily activity bonus
   */
  async checkDailyActivity(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastActive = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
      
      if (!lastActive) {
        // First time activity
        user.lastActiveDate = new Date();
        user.currentStreak = 1;
        user.longestStreak = 1;
        await user.save();
        return await this.addReputation(userId, this.POINTS.DAILY_ACTIVE, 'Daily active');
      }

      const lastActiveDay = new Date(lastActive);
      lastActiveDay.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today - lastActiveDay) / (1000 * 60 * 60 * 24));

      if (daysDiff === 0) {
        // Already active today
        return;
      }

      // Check for return after inactivity
      if (daysDiff >= 30) {
        await this.addReputation(userId, this.POINTS.BACK_AFTER_30_DAYS, 'Back after 30 days!');
        user.currentStreak = 1;
      } else if (daysDiff >= 7) {
        await this.addReputation(userId, this.POINTS.BACK_AFTER_7_DAYS, 'Back after 7 days!');
        user.currentStreak = 1;
      } else if (daysDiff === 1) {
        // Continue streak
        user.currentStreak = (user.currentStreak || 0) + 1;
      } else {
        // Broke streak
        user.currentStreak = 1;
      }

      // Update longest streak
      if (user.currentStreak > (user.longestStreak || 0)) {
        user.longestStreak = user.currentStreak;
      }

      // Check for streak milestones
      if (user.currentStreak === 7 && !user.streakMilestones?.includes(7)) {
        await this.addReputation(userId, this.POINTS.STREAK_7_DAYS, '7-day streak!');
        user.streakMilestones = [...(user.streakMilestones || []), 7];
      } else if (user.currentStreak === 30 && !user.streakMilestones?.includes(30)) {
        await this.addReputation(userId, this.POINTS.STREAK_30_DAYS, '30-day streak!');
        user.streakMilestones = [...(user.streakMilestones || []), 30];
      } else if (user.currentStreak === 100 && !user.streakMilestones?.includes(100)) {
        await this.addReputation(userId, this.POINTS.STREAK_100_DAYS, '100-day streak!');
        user.streakMilestones = [...(user.streakMilestones || []), 100];
      }

      // Award daily active bonus (after streak bonuses)
      if (daysDiff === 1 || (daysDiff > 1 && daysDiff < 7)) {
        await this.addReputation(userId, this.POINTS.DAILY_ACTIVE, 'Daily active');
      }

      user.lastActiveDate = new Date();
      await user.save();

    } catch (error) {
      console.error('Daily activity check error:', error);
    }
  }

  /**
   * Check and award post milestones
   */
  async checkPostMilestone(userId, postCount) {
    try {
      const user = await User.findById(userId);
      if (!user) return;

      const milestones = user.postMilestones || [];

      if (postCount === 10 && !milestones.includes(10)) {
        await this.addReputation(userId, this.POINTS.MILESTONE_10_POSTS, '10 posts milestone!');
        user.postMilestones = [...milestones, 10];
        await user.save();
      } else if (postCount === 50 && !milestones.includes(50)) {
        await this.addReputation(userId, this.POINTS.MILESTONE_50_POSTS, '50 posts milestone!');
        user.postMilestones = [...milestones, 50];
        await user.save();
      } else if (postCount === 100 && !milestones.includes(100)) {
        await this.addReputation(userId, this.POINTS.MILESTONE_100_POSTS, '100 posts milestone!');
        user.postMilestones = [...milestones, 100];
        await user.save();
      }
    } catch (error) {
      console.error('Post milestone check error:', error);
    }
  }

  /**
   * Add reputation points to user
   */
  async addReputation(userId, points, reason = '') {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      user.reputation = Math.max(0, (user.reputation || 0) + points);
      
      // Add to reputation history
      if (!user.reputationHistory) {
        user.reputationHistory = [];
      }
      
      user.reputationHistory.push({
        points,
        reason,
        timestamp: new Date(),
      });

      // Keep only last 100 history entries
      if (user.reputationHistory.length > 100) {
        user.reputationHistory = user.reputationHistory.slice(-100);
      }

      await user.save();

      console.log(`✨ Reputation: ${user.username} ${points > 0 ? '+' : ''}${points} (${reason})`);

      return user.reputation;
    } catch (error) {
      console.error('Add reputation error:', error);
      return null;
    }
  }

  /**
   * Get user's reputation summary
   */
  async getReputationSummary(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      return {
        totalReputation: user.reputation || 0,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        postMilestones: user.postMilestones || [],
        streakMilestones: user.streakMilestones || [],
        recentHistory: (user.reputationHistory || []).slice(-10).reverse(),
      };
    } catch (error) {
      console.error('Get reputation summary error:', error);
      return null;
    }
  }
}

module.exports = new ReputationService();