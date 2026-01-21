const Answer = require('../models/Answer');
const Post = require('../models/Post');
const User = require('../models/User');
const cacheService = require('../services/cacheService');
const reputationService=require("../services/reputationService");
const notificationService = require('../services/notificationService');


// @desc    Create an answer
// @route   POST /api/answers
// @access  Private
exports.createAnswer = async (req, res) => {
  try {
    const { postId, content } = req.body;

    if (!postId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Post ID and content are required',
      });
    }

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Create answer
    const answer = await Answer.create({
      postId,
      authorId: req.user._id,
      content,
    });

    // Update post answer count
    post.answerCount += 1;
    await post.save();

    await notificationService.notifyNewAnswer(
      post.authorId,
      req.user._id,
      postId,
      answer._id
    );

    // Populate author info
    await answer.populate('authorId', 'username avatar reputation');

    // Clear caches
    await cacheService.delPattern(`answers:post:${postId}:*`);
    await cacheService.del(`post:${postId}`);

    res.status(201).json({
      success: true,
      message: 'Answer created successfully',
      answer: answer.getPublicData(),
    });

    console.log(`✅ New answer by ${req.user.username} on post ${postId}`);
  } catch (error) {
    console.error('Create answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating answer',
      error: error.message,
    });
  }
};

// @desc    Get answers for a post
// @route   GET /api/answers/post/:postId
// @access  Public
exports.getAnswersByPostId = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent' } = req.query;

    const cacheKey = `answers:post:${postId}:${sortBy}:${page}:${limit}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case 'votes':
        sort = { upvotes: -1, createdAt: -1 };
        break;
      case 'accepted':
        sort = { isAccepted: -1, upvotes: -1, createdAt: -1 };
        break;
      case 'recent':
      default:
        sort = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const answers = await Answer.find({ postId })
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('authorId', 'username avatar reputation')
      .lean();

    const total = await Answer.countDocuments({ postId });

    const response = {
      success: true,
      answers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalAnswers: total,
        limit: parseInt(limit),
      },
    };

    await cacheService.set(cacheKey, response, 300);

    res.status(200).json(response);
  } catch (error) {
    console.error('Get answers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching answers',
      error: error.message,
    });
  }
};

// @desc    Update an answer
// @route   PUT /api/answers/:id
// @access  Private (Author only)
exports.updateAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
      });
    }

    const answer = await Answer.findById(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found',
      });
    }

    // Check if user is the author
    if (answer.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this answer',
      });
    }

    answer.content = content;
    answer.isEdited = true;
    answer.editedAt = Date.now();

    await answer.save();
    await answer.populate('authorId', 'username avatar reputation');

    // Clear caches
    await cacheService.delPattern(`answers:post:${answer.postId}:*`);

    res.status(200).json({
      success: true,
      message: 'Answer updated successfully',
      answer: answer.getPublicData(),
    });
  } catch (error) {
    console.error('Update answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating answer',
      error: error.message,
    });
  }
};

// @desc    Delete an answer
// @route   DELETE /api/answers/:id
// @access  Private (Author only)
exports.deleteAnswer = async (req, res) => {
  try {
    const { id } = req.params;

    const answer = await Answer.findById(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found',
      });
    }

    // Check if user is the author
    if (answer.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this answer',
      });
    }

    const postId = answer.postId;

    // Update post answer count
    await Post.findByIdAndUpdate(postId, { $inc: { answerCount: -1 } });

    // Delete answer
    await answer.deleteOne();

    // Clear caches
    await cacheService.delPattern(`answers:post:${postId}:*`);
    await cacheService.del(`post:${postId}`);

    res.status(200).json({
      success: true,
      message: 'Answer deleted successfully',
    });
  } catch (error) {
    console.error('Delete answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting answer',
      error: error.message,
    });
  }
};

// @desc    Upvote an answer
// @route   POST /api/answers/:id/upvote
// @access  Private
exports.upvoteAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const answer = await Answer.findById(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found',
      });
    }

    const alreadyUpvoted = answer.upvotedBy.includes(userId);
    const alreadyDownvoted = answer.downvotedBy.includes(userId);

    if (alreadyUpvoted) {
      // Remove upvote
      answer.upvotedBy = answer.upvotedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      answer.upvotes -= 1;

      await reputationService.addReputation(
        answer.authorId,
        -reputationService.POINTS.ANSWER_UPVOTED,
        'Answer upvote removed'
      );
    } else {
      // Add upvote
      answer.upvotedBy.push(userId);
      answer.upvotes += 1;

      // Remove downvote if exists
      if (alreadyDownvoted) {
        answer.downvotedBy = answer.downvotedBy.filter(
          (id) => id.toString() !== userId.toString()
        );
        answer.downvotes -= 1;

        await reputationService.addReputation(
          answer.authorId,
          -reputationService.POINTS.ANSWER_DOWNVOTED,
          'Answer downvote removed'
        );
      }

      await notificationService.notifyAnswerUpvote(
        answer.authorId,
        userId,
        answer._id,
        answer.postId
      );
      await reputationService.awardAnswerUpvote(answer.authorId);
    }

    await answer.save();

    // Clear caches
    await cacheService.delPattern(`answers:post:${answer.postId}:*`);

    res.status(200).json({
      success: true,
      message: alreadyUpvoted ? 'Upvote removed' : 'Answer upvoted',
      upvotes: answer.upvotes,
      downvotes: answer.downvotes,
      netVotes: answer.netVotes,
    });
  } catch (error) {
    console.error('Upvote answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error upvoting answer',
      error: error.message,
    });
  }
};

// @desc    Downvote an answer
// @route   POST /api/answers/:id/downvote
// @access  Private
exports.downvoteAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const answer = await Answer.findById(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found',
      });
    }

    const alreadyDownvoted = answer.downvotedBy.includes(userId);
    const alreadyUpvoted = answer.upvotedBy.includes(userId);

    if (alreadyDownvoted) {
      // Remove downvote
      answer.downvotedBy = answer.downvotedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      answer.downvotes -= 1;

      await reputationService.addReputation(
        answer.authorId,
        -reputationService.POINTS.ANSWER_DOWNVOTED,
        'Answer downvote removed'
      );
    } else {
      // Add downvote
      answer.downvotedBy.push(userId);
      answer.downvotes += 1;

      // Remove upvote if exists
      if (alreadyUpvoted) {
        answer.upvotedBy = answer.upvotedBy.filter(
          (id) => id.toString() !== userId.toString()
        );
        answer.upvotes -= 1;

        await reputationService.addReputation(
          answer.authorId,
          -reputationService.POINTS.ANSWER_UPVOTED,
          'Answer upvote removed'
        );
      }
      await reputationService.penalizeAnswerDownvote(answer.authorId);
    }

    await answer.save();

    // Clear caches
    await cacheService.delPattern(`answers:post:${answer.postId}:*`);

    res.status(200).json({
      success: true,
      message: alreadyDownvoted ? 'Downvote removed' : 'Answer downvoted',
      upvotes: answer.upvotes,
      downvotes: answer.downvotes,
      netVotes: answer.netVotes,
    });
  } catch (error) {
    console.error('Downvote answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downvoting answer',
      error: error.message,
    });
  }
};

// @desc    Accept an answer (for question posts)
// @route   POST /api/answers/:id/accept
// @access  Private (Post author only)
exports.acceptAnswer = async (req, res) => {
  try {
    const { id } = req.params;

    const answer = await Answer.findById(id);

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found',
      });
    }

    // Get the post
    const post = await Post.findById(answer.postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    // Check if user is the post author
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the post author can accept answers',
      });
    }

    // Check if post is a question
    if (post.type !== 'question') {
      return res.status(400).json({
        success: false,
        message: 'Only questions can have accepted answers',
      });
    }

    // Unaccept previous answer if exists
    if (post.acceptedAnswerId) {
      const previousAnswer = await Answer.findById(post.acceptedAnswerId);
      if (previousAnswer) {
        previousAnswer.isAccepted = false;
        await previousAnswer.save();

        await reputationService.addReputation(
          previousAnswer.authorId,
          -reputationService.POINTS.ANSWER_ACCEPTED,
          'Answer unaccepted'
        );
      }
    }

    // Accept the new answer
    answer.isAccepted = true;
    await answer.save();

    // Update post
    post.acceptedAnswerId = answer._id;
    await post.save();

    await notificationService.notifyAnswerAccepted(
      answer.authorId,
      req.user._id,
      answer.postId,
      answer._id
    );
    await reputationService.awardAcceptedAnswer(answer.authorId);
    // Clear caches
    await cacheService.delPattern(`answers:post:${answer.postId}:*`);
    await cacheService.del(`post:${answer.postId}`);

    res.status(200).json({
      success: true,
      message: 'Answer accepted successfully',
      answer: answer.getPublicData(),
    });
  } catch (error) {
    console.error('Accept answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting answer',
      error: error.message,
    });
  }
};