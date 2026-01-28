const mongoose = require("mongoose");
const Interaction = require("../models/Interaction");
const User = require("../models/User");
const Post = require("../models/Post");

/**
 * @route   POST /api/analytics/track-interaction
 */
exports.trackInteraction = async (req, res) => {
  console.log("🔥 trackInteraction HIT");
  console.log("BODY:", req.body);
  console.log("USER:", req.user && { _id: req.user._id, username: req.user.username });

  try {
    const { postId, action, metadata = {} } = req.body;
    const userId = req.user._id; // FIXED: Use _id instead of id

    if (!postId || !action) {
      console.log("⛔ Missing postId or action");
      return res.status(400).json({
        success: false,
        message: "postId and action are required",
      });
    }

    const validActions = [
      "view",
      "click",
      "upvote",
      "downvote",
      "share",
      "comment",
      "save",
      "answer",
      "tag_click",
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action type",
      });
    }

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    console.log("🔥 Creating interaction...");

    // Create interaction
    const interaction = await Interaction.create({
      userId,
      postId,
      action,
      metadata: {
        timeSpent: metadata.timeSpent || 0,
        scrollDepth: metadata.scrollDepth || 0,
        source: metadata.source || "feed",
        deviceType: metadata.deviceType || "desktop",
        sessionId: metadata.sessionId || req.sessionID,
        clickPosition: metadata.clickPosition || 0,
        tag: metadata.tag || undefined,
      },
      label: determineLabel(action, metadata),
    });

    console.log("✅ Interaction saved:", interaction._id);

    // Update user history asynchronously
    updateUserHistory(userId, postId, action, metadata).catch((err) => {
      console.error("Error updating user history:", err);
    });

    // Update post metrics asynchronously
    updatePostMetrics(postId, action, metadata).catch((err) => {
      console.error("Error updating post metrics:", err);
    });

    res.status(200).json({
      success: true,
      message: "Interaction tracked successfully",
      interaction: interaction._id,
    });
    
    console.log(`📊 Tracked ${action} on post ${postId} by user ${req.user.username}`);
  } catch (error) {
    console.error("❌ Track interaction error:", error);
    res.status(500).json({
      success: false,
      message: "Error tracking interaction",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/analytics/my-interactions
 */
exports.getMyInteractions = async (req, res) => {
  try {
    const { limit = 50, action } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (action) {
      query.action = action;
    }

    const interactions = await Interaction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate("postId", "title type tags")
      .lean();

    res.status(200).json({
      success: true,
      count: interactions.length,
      interactions,
    });
  } catch (error) {
    console.error("Get my interactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching interactions",
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/analytics/post/:postId
 */
exports.getPostAnalytics = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this post analytics",
      });
    }

    // FIXED: Use new mongoose.Types.ObjectId()
    const stats = await Interaction.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId) } },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
          avgTimeSpent: { $avg: "$metadata.timeSpent" },
          avgScrollDepth: { $avg: "$metadata.scrollDepth" },
        },
      },
    ]);

    const engagementRate = await Interaction.calculateEngagementRate(postId);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const timeSeriesData = await Interaction.aggregate([
      {
        $match: {
          postId: new mongoose.Types.ObjectId(postId),
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            action: "$action",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        post: {
          _id: post._id,
          title: post.title,
          type: post.type,
        },
        stats,
        engagementRate,
        timeSeriesData,
        engagementMetrics: post.engagementMetrics,
      },
    });
  } catch (error) {
    console.error("Get post analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post analytics",
      error: error.message,
    });
  }
};

/**
 * @desc    Get user's ML profile data
 * @route   GET /api/analytics/ml-profile
 * @access  Private
 */
exports.getMLProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("userInteractions mlProfile interests")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userInteractions = user.userInteractions || {
      viewedPosts: [],
      upvotedPosts: [],
      downvotedPosts: [],
      clickedTags: [],
      searchHistory: [],
    };

    // Calculate top interacted tags
    const topTags = await calculateTopTags(req.user._id);

    res.status(200).json({
      success: true,
      mlProfile: {
        ...(user.mlProfile || {}),
        topTags,
        totalInteractions: userInteractions.viewedPosts.length,
        totalUpvotes: userInteractions.upvotedPosts.length,
        totalSaves: user.savedPosts?.length || 0,
      },
    });
  } catch (error) {
    console.error("Get ML profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching ML profile",
      error: error.message,
    });
  }
};

// ============= Helper Functions =============

/**
 * Determine if interaction is positive (label = 1) or not (label = 0)
 */
function determineLabel(action, metadata) {
  // Positive signals
  const positiveActions = ["upvote", "save", "share", "comment", "answer"];
  if (positiveActions.includes(action)) {
    return 1;
  }

  // Long view is positive
  if (action === "view" && metadata.timeSpent > 30) {
    return 1;
  }

  // High scroll depth is positive
  if (action === "view" && metadata.scrollDepth > 70) {
    return 1;
  }

  // Downvote is negative
  if (action === "downvote") {
    return 0;
  }

  // Quick exit is negative
  if (action === "view" && metadata.timeSpent < 5) {
    return 0;
  }

  // Default: neutral (0)
  return 0;
}

/**
 * Update user interaction history
 */
async function updateUserHistory(userId, postId, action, metadata) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for history update:', userId);
      return;
    }

    // Initialize userInteractions if it doesn't exist
    if (!user.userInteractions) {
      user.userInteractions = {
        viewedPosts: [],
        upvotedPosts: [],
        downvotedPosts: [],
        clickedTags: [],
        searchHistory: []
      };
    }

    // Update viewed posts
    if (action === "view") {
      const existingView = user.userInteractions.viewedPosts.find(
        (v) => v.postId.toString() === postId.toString(),
      );

      if (existingView) {
        // Update existing view
        existingView.timeSpent += metadata.timeSpent || 0;
        existingView.scrollDepth = Math.max(
          existingView.scrollDepth,
          metadata.scrollDepth || 0,
        );
        existingView.timestamp = new Date();
      } else {
        // Add new view
        user.userInteractions.viewedPosts.push({
          postId,
          timestamp: new Date(),
          timeSpent: metadata.timeSpent || 0,
          scrollDepth: metadata.scrollDepth || 0,
        });

        // Keep only last 100 views
        if (user.userInteractions.viewedPosts.length > 100) {
          user.userInteractions.viewedPosts = user.userInteractions.viewedPosts.slice(-100);
        }
      }
    }

    // Update upvoted posts
    if (action === "upvote") {
      const alreadyUpvoted = user.userInteractions.upvotedPosts.some(
        (v) => v.postId.toString() === postId.toString(),
      );

      if (!alreadyUpvoted) {
        user.userInteractions.upvotedPosts.push({
          postId,
          timestamp: new Date(),
        });
      }
    }

    // Update downvoted posts
    if (action === "downvote") {
      const alreadyDownvoted = user.userInteractions.downvotedPosts.some(
        (v) => v.postId.toString() === postId.toString(),
      );

      if (!alreadyDownvoted) {
        user.userInteractions.downvotedPosts.push({
          postId,
          timestamp: new Date(),
        });
      }
    }

    // Update tag clicks
    if (action === "tag_click" && metadata.tag) {
      const existingTag = user.userInteractions.clickedTags.find(
        (t) => t.tag === metadata.tag
      );

      if (existingTag) {
        existingTag.count += 1;
        existingTag.lastClicked = new Date();
      } else {
        user.userInteractions.clickedTags.push({
          tag: metadata.tag,
          count: 1,
          lastClicked: new Date(),
        });
      }

      // Keep only top 50 tags
      if (user.userInteractions.clickedTags.length > 50) {
        user.userInteractions.clickedTags.sort((a, b) => b.count - a.count);
        user.userInteractions.clickedTags = user.userInteractions.clickedTags.slice(0, 50);
      }
    }

    await user.save();
    console.log(`✅ Updated user history for ${user.username}: ${action}`);
  } catch (error) {
    console.error('Error in updateUserHistory:', error);
  }
}

/**
 * Update post engagement metrics
 */
async function updatePostMetrics(postId, action, metadata) {
  try {
    const post = await Post.findById(postId);
    if (!post) {
      console.error('Post not found for metrics update:', postId);
      return;
    }

    // Initialize engagementMetrics if it doesn't exist
    if (!post.engagementMetrics) {
      post.engagementMetrics = {
        avgTimeSpent: 0,
        clickThroughRate: 0,
        completionRate: 0,
        totalImpressions: 0,
        totalClicks: 0,
      };
    }

    // Update impressions
    if (action === "view") {
      post.engagementMetrics.totalImpressions += 1;
    }

    // Update clicks
    if (action === "click") {
      post.engagementMetrics.totalClicks += 1;
    }

    // Update average time spent
    if (action === "view" && metadata.timeSpent) {
      const currentAvg = post.engagementMetrics.avgTimeSpent || 0;
      const totalViews = post.engagementMetrics.totalImpressions || 1;

      post.engagementMetrics.avgTimeSpent =
        (currentAvg * (totalViews - 1) + metadata.timeSpent) / totalViews;
    }

    // Update CTR
    if (post.engagementMetrics.totalImpressions > 0) {
      post.engagementMetrics.clickThroughRate =
        post.engagementMetrics.totalClicks / post.engagementMetrics.totalImpressions;
    }

    // Update completion rate
    if (action === "view" && metadata.scrollDepth) {
      const currentRate = post.engagementMetrics.completionRate || 0;
      const totalViews = post.engagementMetrics.totalImpressions || 1;
      const completion = metadata.scrollDepth > 80 ? 1 : 0;

      post.engagementMetrics.completionRate =
        (currentRate * (totalViews - 1) + completion) / totalViews;
    }

    await post.save();
    console.log(`✅ Updated post metrics for ${post.title}: ${action}`);
  } catch (error) {
    console.error('Error in updatePostMetrics:', error);
  }
}

/**
 * Calculate user's top tags based on interactions
 */
async function calculateTopTags(userId) {
  try {
    const interactions = await Interaction.find({
      userId,
      action: { $in: ["view", "upvote", "save", "click"] },
    })
      .populate("postId", "tags")
      .lean();

    const tagCounts = {};

    interactions.forEach((interaction) => {
      if (interaction.postId && interaction.postId.tags) {
        interaction.postId.tags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  } catch (error) {
    console.error('Error calculating top tags:', error);
    return [];
  }
}

module.exports = exports;