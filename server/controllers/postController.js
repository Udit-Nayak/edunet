const Post = require("../models/Post");
const Answer = require("../models/Answer");
const User = require("../models/User");
const cacheService = require("../services/cacheService");
const storageService = require("../services/storageService");
const reputationService=require("../services/reputationService");

// @route   POST /api/posts
exports.createPost = async (req, res) => {
  try {
    const { type, title, content, tags, attachments, status } = req.body;

    if (!type || !title || !content) {
      return res.status(400).json({
        success: false,
        message: "Type, title and content are required",
      });
    }

    if (attachments && attachments.length > 0) {
      const supabaseUrl = process.env.SUPABASE_URL;

      const validAttachments = attachments.every((attachment) => {
        // Check basic structure
        const hasRequiredFields =
          attachment.url &&
          attachment.name &&
          attachment.type &&
          ["image", "pdf"].includes(attachment.type);

        // Check if URL is from Supabase (if SUPABASE_URL is set)
        const isValidUrl = supabaseUrl
          ? attachment.url.startsWith(
              `${supabaseUrl}/storage/v1/object/public/`
            )
          : attachment.url.includes("supabase.co/storage/v1/object/public/");

        return hasRequiredFields && isValidUrl;
      });

      if (!validAttachments) {
        return res.status(400).json({
          success: false,
          message: "Invalid attachment format or unauthorized storage URL",
        });
      }

      // Verify files belong to the user
      const userId = req.user._id.toString();
      const userOwnsAllFiles = attachments.every((attachment) => {
        const filePath = storageService.extractFilePathFromUrl(attachment.url);
        return filePath && filePath.startsWith(userId);
      });

      if (!userOwnsAllFiles) {
        return res.status(403).json({
          success: false,
          message: "You can only attach your own uploaded files",
        });
      }
    }

    const post = await Post.create({
      type,
      title,
      content,
      authorId: req.user._id,
      tags: tags || [],
      attachments: attachments || [],
      status: status || "published",
    });

    await post.populate("authorId", "username avatar reputation");

    await cacheService.delPattern("posts:*");

    const userPostCount = await Post.countDocuments({ 
      authorId: req.user._id,
      status: 'published'
    });
    
    await reputationService.checkPostMilestone(req.user._id, userPostCount);

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: post.getPublicData(),
    }),
      console.log(`✅ New ${type} created by ${req.user.username}`);
  } catch (error) {
    console.error("Created post error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
      error: error.message,
    });
  }
};

// @route   GET /api/posts
exports.getPosts = async (req, res) => {
  try {
    const {
      type,
      tag,
      authorId,
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = "recent", // recent, popular, trending
    } = req.query;

    // Build query
    const query = {};

    if (type) query.type = type;
    if (tag) query.tags = tag;
    if (authorId) query.authorId = authorId;
    if (status) query.status = status;
    else query.status = "published"; // Default to published posts

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case "popular":
        sort = { upvotes: -1, createdAt: -1 };
        break;
      case "trending":
        sort = { viewCount: -1, upvotes: -1, createdAt: -1 };
        break;
      case "recent":
      default:
        sort = { createdAt: -1 };
    }

    // Cache key
    const cacheKey = `posts:${JSON.stringify(
      query
    )}:${sortBy}:${page}:${limit}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("authorId", "username avatar reputation")
      .lean();

    const total = await Post.countDocuments(query);

    const response = {
      success: true,
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalPosts: total,
        limit: parseInt(limit),
      },
    };

    // Cache for 5 minutes
    await cacheService.set(cacheKey, response, 300);

    res.status(200).json(response);
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts",
      error: error.message,
    });
  }
};

// @route   GET /api/posts/:id
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const cacheKey = `post:${id}`;
    const cachedPost = await cacheService.get(cacheKey);

    if (cachedPost) {
      return res.status(200).json({
        success: true,
        post: cachedPost,
      });
    }

    const post = await Post.findById(id).populate(
      "authorId",
      "username avatar reputation bio"
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    const postData = post.getPublicData();

    // Cache for 5 minutes
    await cacheService.set(cacheKey, postData, 300);

    res.status(200).json({
      success: true,
      post: postData,
    });
  } catch (error) {
    console.error("Get post by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
      error: error.message,
    });
  }
};

// @route   PUT /api/posts/:id
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, tags, attachments, status } = req.body;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if user is the author
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this post",
      });
    }

    // Update fields
    if (title) post.title = title;
    if (content) post.content = content;
    if (tags) post.tags = tags;
    if (attachments) post.attachments = attachments;
    if (status) post.status = status;

    post.isEdited = true;
    post.editedAt = Date.now();

    await post.save();
    await post.populate("authorId", "username avatar reputation");

    // Clear caches
    await cacheService.del(`post:${id}`);
    await cacheService.delPattern("posts:*");

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: post.getPublicData(),
    });

    console.log(`✅ Post updated by ${req.user.username}`);
  } catch (error) {
    console.error("Update post error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating post",
      error: error.message,
    });
  }
};

// @route   DELETE /api/posts/:id
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if user is the author
    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this post",
      });
    }

    if (post.attachments && post.attachments.length > 0) {
      const filePaths = post.attachments
        .map((attachment) =>
          storageService.extractFilePathFromUrl(attachment.url)
        )
        .filter(Boolean);

      if (filePaths.length > 0) {
        try {
          await storageService.deleteMultipleFiles(
            "post-attachments",
            filePaths
          );
        } catch (error) {
          console.error("Error deleting attachments:", error);
          // Continue with post deletion even if file deletion fails
        }
      }
    }
    // Delete all answers associated with this post
    await Answer.deleteMany({ postId: id });

    // Delete the post
    await post.deleteOne();

    // Clear caches
    await cacheService.del(`post:${id}`);
    await cacheService.delPattern("posts:*");
    await cacheService.delPattern(`answers:post:${id}:*`);

    res.status(200).json({
      success: true,
      message: "Post and associated answers deleted successfully",
    });

    console.log(`✅ Post deleted by ${req.user.username}`);
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
      error: error.message,
    });
  }
};

// @route   POST /api/posts/:id/upvote
exports.upvotePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if user already upvoted
    const alreadyUpvoted = post.upvotedBy.includes(userId);
    const alreadyDownvoted = post.downvotedBy.includes(userId);

    if (alreadyUpvoted) {
      // Remove upvote
      post.upvotedBy = post.upvotedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      post.upvotes -= 1;
    } else {
      // Add upvote
      post.upvotedBy.push(userId);
      post.upvotes += 1;

      // Remove downvote if exists
      if (alreadyDownvoted) {
        post.downvotedBy = post.downvotedBy.filter(
          (id) => id.toString() !== userId.toString()
        );
        post.downvotes -= 1;
      }
    }

    await post.save();

    // Update author reputation
    const author = await User.findById(post.authorId);
    if (author) {
      author.reputation = Math.max(
        0,
        author.reputation + (alreadyUpvoted ? -5 : 5)
      );
      await author.save();
    }

    // Clear caches
    await cacheService.del(`post:${id}`);
    await cacheService.delPattern("posts:*");

    res.status(200).json({
      success: true,
      message: alreadyUpvoted ? "Upvote removed" : "Post upvoted",
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      netVotes: post.netVotes,
    });
  } catch (error) {
    console.error("Upvote post error:", error);
    res.status(500).json({
      success: false,
      message: "Error upvoting post",
      error: error.message,
    });
  }
};

// @route   POST /api/posts/:id/downvote
exports.downvotePost = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const alreadyDownvoted = post.downvotedBy.includes(userId);
    const alreadyUpvoted = post.upvotedBy.includes(userId);

    if (alreadyDownvoted) {
      // Remove downvote
      post.downvotedBy = post.downvotedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      post.downvotes -= 1;
    } else {
      // Add downvote
      post.downvotedBy.push(userId);
      post.downvotes += 1;

      // Remove upvote if exists
      if (alreadyUpvoted) {
        post.upvotedBy = post.upvotedBy.filter(
          (id) => id.toString() !== userId.toString()
        );
        post.upvotes -= 1;
      }
    }

    await post.save();

    // Update author reputation
    const author = await User.findById(post.authorId);
    if (author) {
      author.reputation = Math.max(
        0,
        author.reputation + (alreadyDownvoted ? 2 : -2)
      );
      await author.save();
    }

    // Clear caches
    await cacheService.del(`post:${id}`);
    await cacheService.delPattern("posts:*");

    res.status(200).json({
      success: true,
      message: alreadyDownvoted ? "Downvote removed" : "Post downvoted",
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      netVotes: post.netVotes,
    });
  } catch (error) {
    console.error("Downvote post error:", error);
    res.status(500).json({
      success: false,
      message: "Error downvoting post",
      error: error.message,
    });
  }
};

// @route   GET /api/posts/tag/:tag
exports.getPostsByTag = async (req, res) => {
  try {
    const { tag } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const cacheKey = `posts:tag:${tag}:${page}:${limit}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find({
      tags: tag,
      status: "published",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("authorId", "username avatar reputation")
      .lean();

    const total = await Post.countDocuments({ tags: tag, status: "published" });

    const response = {
      success: true,
      tag,
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalPosts: total,
        limit: parseInt(limit),
      },
    };

    await cacheService.set(cacheKey, response, 300);

    res.status(200).json(response);
  } catch (error) {
    console.error("Get posts by tag error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching posts by tag",
      error: error.message,
    });
  }
};

// @route   GET /api/posts/user/:userId
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, type } = req.query;

    const query = { authorId: userId, status: "published" };
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("authorId", "username avatar reputation")
      .lean();

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalPosts: total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get user posts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user posts",
      error: error.message,
    });
  }
};
