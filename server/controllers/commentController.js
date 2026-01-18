const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Answer = require("../models/Answer");
const User = require("../models/User");
const cacheService = require("../services/cacheService");
const notificationService = require('../services/notificationService'); 

// @desc    Create a comment on a post or answer
// @route   POST /api/comments
// @access  Private
exports.createComment = async (req, res) => {
  try {
    const { postId, answerId, parentCommentId, content, mentions } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    if (!postId && !answerId) {
      return res.status(400).json({
        success: false,
        message: "Either postId or answerId is required",
      });
    }

    // Check depth limit for nested comments
    let depth = 0;
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found",
        });
      }
      depth = parentComment.depth + 1;

      if (depth > 2) {
        return res.status(400).json({
          success: false,
          message: "Maximum comment nesting depth reached (3 levels)",
        });
      }
    }

        let postAuthorId = null;
    let actualPostId = postId;


    // Verify post or answer exists
    if (postId) {
      const post = await Post.findByIdAndUpdate(postId, { $inc: { commentCount: 1 } });
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }
      postAuthorId = post.authorId;
      
      // Increment view count for commenting on post
      const isAuthor = post.authorId.toString() === req.user._id.toString();
      if (!isAuthor) {
        const viewKey = `view:${postId}:${req.user._id}`;
        const hasViewed = await cacheService.get(viewKey);

        if (!hasViewed) {
          post.viewCount += 1;
          await post.save();
          await cacheService.set(viewKey, true, 3600);
          console.log(`👁️ View count incremented (via comment) for post ${postId} by ${req.user.username}`);
        }
      }
    }
    if (answerId) {
      const answer = await Answer.findByIdAndUpdate(answerId, { $inc: { commentCount: 1 } });
      if (!answer) {
        return res.status(404).json({
          success: false,
          message: "Answer not found",
        });
      }
      actualPostId = answer.postId;
      
      // Get the post to increment view count
      const post = await Post.findById(answer.postId);
      if (post) {
        const isAuthor = post.authorId.toString() === req.user._id.toString();
        if (!isAuthor) {
          const viewKey = `view:${answer.postId}:${req.user._id}`;
          const hasViewed = await cacheService.get(viewKey);

          if (!hasViewed) {
            post.viewCount += 1;
            await post.save();
            await cacheService.set(viewKey, true, 3600);
            console.log(`👁️ View count incremented (via answer comment) for post ${answer.postId} by ${req.user.username}`);
          }
        }
      }
    }

    // Create comment
    const comment = await Comment.create({
      postId: postId || undefined,
      answerId: answerId || undefined,
      parentCommentId: parentCommentId || null,
      authorId: req.user._id,
      content,
      mentions: mentions || [],
      depth,
    });

    if (postId) {
      const post = await Post.findById(postId);
      if (post) {
        await notificationService.notifyNewCommentOnPost(post.authorId, req.user._id, postId, comment._id);
      }
    } else if (answerId) {
      const answer = await Answer.findById(answerId);
      if (answer) {
        await notificationService.notifyNewCommentOnAnswer(answer.authorId, req.user._id, answer.postId, answerId, comment._id);
      }
    }

    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (parentComment) {
        await notificationService.notifyReplyToComment(parentComment.authorId, req.user._id, postId || parentComment.postId, comment._id);
      }
    }

    await comment.populate("authorId", "username avatar reputation");

    // Clear caches
    if (postId) {
      await cacheService.delPattern(`comments:post:${postId}:*`);
      await cacheService.del(`post:${postId}`);
    }
    if (answerId) {
      await cacheService.delPattern(`comments:answer:${answerId}:*`);
    }

    res.status(201).json({
      success: true,
      message: "Comment created successfully",
      comment: comment.getPublicData(),
    });

    console.log(`✅ New comment by ${req.user.username}`);
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating comment",
      error: error.message,
    });
  }
};

// @desc    Get comments for a post
// @route   GET /api/comments/post/:postId
// @access  Public
exports.getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const cacheKey = `comments:post:${postId}:${page}:${limit}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get top-level comments only
    const comments = await Comment.find({
      postId,
      parentCommentId: null,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("authorId", "username avatar reputation")
      .lean();

    // Get replies for each comment
    for (let comment of comments) {
      comment.replies = await Comment.find({
        parentCommentId: comment._id,
      })
        .sort({ createdAt: 1 })
        .populate("authorId", "username avatar reputation")
        .lean();

      // Get nested replies (level 2)
      for (let reply of comment.replies) {
        reply.replies = await Comment.find({
          parentCommentId: reply._id,
        })
          .sort({ createdAt: 1 })
          .populate("authorId", "username avatar reputation")
          .lean();
      }
    }

    const total = await Comment.countDocuments({
      postId,
      parentCommentId: null,
    });

    const response = {
      success: true,
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalComments: total,
        limit: parseInt(limit),
      },
    };

    await cacheService.set(cacheKey, response, 300);

    res.status(200).json(response);
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: error.message,
    });
  }
};

// @desc    Get comments for an answer
// @route   GET /api/comments/answer/:answerId
// @access  Public
exports.getCommentsByAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const cacheKey = `comments:answer:${answerId}:${page}:${limit}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const comments = await Comment.find({
      answerId,
      parentCommentId: null,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("authorId", "username avatar reputation")
      .lean();

    // Get replies
    for (let comment of comments) {
      comment.replies = await Comment.find({
        parentCommentId: comment._id,
      })
        .sort({ createdAt: 1 })
        .populate("authorId", "username avatar reputation")
        .lean();

      for (let reply of comment.replies) {
        reply.replies = await Comment.find({
          parentCommentId: reply._id,
        })
          .sort({ createdAt: 1 })
          .populate("authorId", "username avatar reputation")
          .lean();
      }
    }

    const total = await Comment.countDocuments({
      answerId,
      parentCommentId: null,
    });

    const response = {
      success: true,
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalComments: total,
        limit: parseInt(limit),
      },
    };

    await cacheService.set(cacheKey, response, 300);

    res.status(200).json(response);
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: error.message,
    });
  }
};

// @desc    Update a comment
// @route   PUT /api/comments/:id
// @access  Private (Author only)
exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "Content is required",
      });
    }

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this comment",
      });
    }

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = Date.now();

    await comment.save();
    await comment.populate("authorId", "username avatar reputation");

    // Clear caches
    if (comment.postId) {
      await cacheService.delPattern(`comments:post:${comment.postId}:*`);
    }
    if (comment.answerId) {
      await cacheService.delPattern(`comments:answer:${comment.answerId}:*`);
    }

    res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: comment.getPublicData(),
    });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating comment",
      error: error.message,
    });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private (Author only)
exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    // Delete all child comments recursively
    await deleteCommentAndChildren(id);

    // Clear caches
    if (comment.postId) {
      await cacheService.delPattern(`comments:post:${comment.postId}:*`);
    }
    if (comment.answerId) {
      await cacheService.delPattern(`comments:answer:${comment.answerId}:*`);
    }

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting comment",
      error: error.message,
    });
  }
};

// Helper function to delete comment and all children
async function deleteCommentAndChildren(commentId) {
  const comment = await Comment.findById(commentId);

  // Find all child comments
  const children = await Comment.find({ parentCommentId: commentId });

  // Recursively delete children
  for (let child of children) {
    await deleteCommentAndChildren(child._id);
  }

  // Decrement count
  if (comment.postId) {
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentCount: -1 },
    });
  }
  if (comment.answerId) {
    await Answer.findByIdAndUpdate(comment.answerId, {
      $inc: { commentCount: -1 },
    });
  }

  // Delete the comment itself
  await Comment.findByIdAndDelete(commentId);
}

// @desc    Upvote a comment
// @route   POST /api/comments/:id/upvote
// @access  Private
exports.upvoteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const alreadyUpvoted = comment.upvotedBy.includes(userId);

    if (alreadyUpvoted) {
      // Remove upvote
      comment.upvotedBy = comment.upvotedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      comment.upvotes -= 1;
    } else {
      // Add upvote
      comment.upvotedBy.push(userId);
      comment.upvotes += 1;

      await notificationService.notifyCommentUpvote(
        comment.authorId,
        userId,
        comment._id,
        comment.postId
      );
    }

    await comment.save();

    // Clear caches
    if (comment.postId) {
      await cacheService.delPattern(`comments:post:${comment.postId}:*`);
    }
    if (comment.answerId) {
      await cacheService.delPattern(`comments:answer:${comment.answerId}:*`);
    }

    res.status(200).json({
      success: true,
      message: alreadyUpvoted ? "Upvote removed" : "Comment upvoted",
      upvotes: comment.upvotes,
    });
  } catch (error) {
    console.error("Upvote comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error upvoting comment",
      error: error.message,
    });
  }
};
