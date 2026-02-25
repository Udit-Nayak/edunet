const Post = require("../models/Post");
const Answer = require("../models/Answer");
const User = require("../models/User");
const cacheService = require("../services/cacheService");
const storageService = require("../services/storageService");
const reputationService = require("../services/reputationService");
const notificationService = require("../services/notificationService");
const mlService = require("../services/mlService");

const clearSearchCaches = async () => {
  try {
    // Clear all search caches
    await cacheService.delPattern("search:*");
    await cacheService.delPattern("suggestions:*");
    await cacheService.delPattern("trending:*");
    await cacheService.delPattern("popular:*");
    console.log("✅ Search caches cleared");
  } catch (error) {
    console.error("Error clearing search caches:", error);
  }
};

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
        const hasRequiredFields =
          attachment.url &&
          attachment.name &&
          attachment.type &&
          ["image", "pdf"].includes(attachment.type);

        const isValidUrl = supabaseUrl
          ? attachment.url.startsWith(
              `${supabaseUrl}/storage/v1/object/public/`,
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
    if (status === "published") {
  generateEmbeddingAsync(post._id, title, content, tags || []).catch(
    (err) => console.error("Embedding generation failed:", err),
  );
}

    await cacheService.delPattern("posts:*");
    await clearSearchCaches();

    const userPostCount = await Post.countDocuments({
      authorId: req.user._id,
      status: "published",
    });

    await reputationService.checkPostMilestone(req.user._id, userPostCount);

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: post.getPublicData(),
    });

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

async function generateEmbeddingAsync(postId, title, content, tags) {
  try {
    console.log(`🔄 Generating embedding for post ${postId}...`);
    
    const embedding = await mlService.generatePostEmbedding(title, content, tags);

    if (embedding) {
      await Post.findByIdAndUpdate(postId, {
        $set: {
          "mlMetadata.embedding": embedding,
          "mlMetadata.lastEmbeddingUpdate": new Date(),
        },
      });
      console.log(`✅ Embedding generated for post ${postId}`);
    } else {
      console.error(`❌ Failed to generate embedding for post ${postId}`);
    }
  } catch (error) {
    console.error(
      `❌ Embedding generation failed for post ${postId}:`,
      error.message,
    );
  }
}

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
      sortBy = "recent",
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (tag) query.tags = tag;
    if (authorId) query.authorId = authorId;
    if (status) query.status = status;
    else query.status = "published";

    if (search) {
      query.$text = { $search: search };
    }

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

    const cacheKey = `posts:${JSON.stringify(query)}:${sortBy}:${page}:${limit}:${req.user?._id || "guest"}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let posts = await Post.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("+upvotes +downvotes +upvotedBy +downvotedBy")
      .populate("authorId", "username avatar reputation")
      .lean();

    posts = await addSavedStatusToPosts(posts, req.user._id);

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
    const { incrementView } = req.query;

    const cacheKey = `post:${id}`;
    const cachedPost = await cacheService.get(cacheKey);

    let post;

    if (cachedPost) {
      post = await Post.findById(id)
        .select("+upvotes +downvotes +upvotedBy +downvotedBy")
        .populate("authorId", "username avatar reputation bio");
    } else {
      post = await Post.findById(id)
        .select("+upvotes +downvotes +upvotedBy +downvotedBy")
        .populate("authorId", "username avatar reputation bio");

      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found",
        });
      }
    }

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const isAuthor =
      req.user && req.user._id.toString() === post.authorId._id.toString();

    if (incrementView === "true" && !isAuthor) {
      // Check if this user has already viewed this post recently (using cache)
      const viewKey = `view:${id}:${req.user ? req.user._id : req.ip}`;
      const hasViewed = await cacheService.get(viewKey);

      if (!hasViewed) {
        // Increment view count
        post.viewCount += 1;
        await post.save();

        // Mark as viewed for 1 hour (3600 seconds)
        await cacheService.set(viewKey, true, 3600);

        console.log(
          `👁️ View count incremented for post ${id} by ${req.user ? req.user.username : "guest"}`,
        );
      }
    }

    let postData = post.toObject();
    postData.netVotes = (post.upvotes || 0) - (post.downvotes || 0);

    // Cache for 5 minutes

    if (req.user) {
      const user = await User.findById(req.user._id);
      postData.isSaved = user.savedPosts.includes(id);
      postData.userVote = post.upvotedBy.includes(req.user._id)
        ? "upvote"
        : post.downvotedBy.includes(req.user._id)
          ? "downvote"
          : null;
    }

    if (req.user && post.authorId._id.toString() === req.user._id.toString()) {
      postData.saveCount = post.saveCount;
    }

    const similarPosts = await mlService.getSimilarPosts(post._id, 5);

    await cacheService.set(cacheKey, postData, 300);

    res.status(200).json({
      success: true,
      post: postData,
      similarPosts,
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

async function getSimilarLivePosts(postId, limit = 5) {
  try {
    const cacheKey = `embedding:post:${postId}`;

    // 1️⃣ Try cache first
    let embedding = await cacheService.get(cacheKey);

    if (!embedding) {
      // 2️⃣ Fallback to DB
      const post = await Post.findById(postId).select("mlMetadata.embedding");

      if (!post || !post.mlMetadata?.embedding) {
        return [];
      }

      embedding = post.mlMetadata.embedding;

      // 3️⃣ Cache for 7 days
      await cacheService.set(cacheKey, embedding, 60 * 60 * 24 * 7);
    }

    // 4️⃣ Similarity search
    const similarPosts = await Post.aggregate([
      {
        $match: {
          _id: { $ne: new mongoose.Types.ObjectId(postId) },
          status: "published",
          "mlMetadata.embedding": { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          similarity: {
            $reduce: {
              input: { $range: [0, embedding.length] },
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  {
                    $multiply: [
                      { $arrayElemAt: ["$mlMetadata.embedding", "$$this"] },
                      { $arrayElemAt: [embedding, "$$this"] },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { similarity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "authorId",
          foreignField: "_id",
          as: "authorId",
        },
      },
      { $unwind: "$authorId" },
      {
        $project: {
          title: 1,
          type: 1,
          tags: 1,
          createdAt: 1,
          "authorId.username": 1,
          "authorId.avatar": 1,
          similarity: 1,
        },
      },
    ]);

    return similarPosts;
  } catch (error) {
    console.error("Similar posts error:", error);
    return [];
  }
}

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

    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this post",
      });
    }

    if (title) post.title = title;
    if (content) post.content = content;
    if (tags) post.tags = tags;
    if (attachments) post.attachments = attachments;
    if (status) post.status = status;

    post.isEdited = true;
    post.editedAt = Date.now();

    await post.save();
    await post.populate("authorId", "username avatar reputation");

    await cacheService.del(`post:${id}`);
    await cacheService.delPattern("posts:*");
    // Clear search caches when post is updated
    await clearSearchCaches();

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

    if (post.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this post",
      });
    }

    if (post.attachments && post.attachments.length > 0) {
      const filePaths = post.attachments
        .map((attachment) =>
          storageService.extractFilePathFromUrl(attachment.url),
        )
        .filter(Boolean);

      if (filePaths.length > 0) {
        try {
          await storageService.deleteMultipleFiles(
            "post-attachments",
            filePaths,
          );
        } catch (error) {
          console.error("Error deleting attachments:", error);
        }
      }
    }

    await Answer.deleteMany({ postId: id });
    await post.deleteOne();

    await cacheService.del(`post:${id}`);
    await cacheService.delPattern("posts:*");
    await cacheService.delPattern(`answers:post:${id}:*`);
    // Clear search caches when post is deleted
    await clearSearchCaches();

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

    const isAuthor = post.authorId.toString() === userId.toString();

    if (!isAuthor) {
      // Check if this user has already viewed this post recently (using cache)
      const viewKey = `view:${id}:${userId}`;
      const hasViewed = await cacheService.get(viewKey);

      if (!hasViewed) {
        // Increment view count since user is engaging with the post
        post.viewCount += 1;

        // Mark as viewed for 1 hour (3600 seconds)
        await cacheService.set(viewKey, true, 3600);

        console.log(
          `👁️ View count incremented (via upvote) for post ${id} by ${req.user.username}`,
        );
      }
    }
    if (alreadyUpvoted) {
      // Remove upvote
      post.upvotedBy = post.upvotedBy.filter(
        (id) => id.toString() !== userId.toString(),
      );
      post.upvotes -= 1;
    } else {
      // Add upvote
      post.upvotedBy.push(userId);
      post.upvotes += 1;

      // Remove downvote if exists
      if (alreadyDownvoted) {
        post.downvotedBy = post.downvotedBy.filter(
          (id) => id.toString() !== userId.toString(),
        );
        post.downvotes -= 1;
      }

      if (!isAuthor) {
        await notificationService.notifyPostUpvote(
          post.authorId,
          userId,
          post._id,
        );
      }
    }

    await post.save();

    // Update author reputation
    const author = await User.findById(post.authorId);
    if (author) {
      author.reputation = Math.max(
        0,
        author.reputation + (alreadyUpvoted ? -5 : 5),
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
      viewCount: post.viewCount,
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

    const isAuthor = post.authorId.toString() === userId.toString();
    if (!isAuthor) {
      // Check if this user has already viewed this post recently (using cache)
      const viewKey = `view:${id}:${userId}`;
      const hasViewed = await cacheService.get(viewKey);

      if (!hasViewed) {
        // Increment view count since user is engaging with the post
        post.viewCount += 1;

        // Mark as viewed for 1 hour (3600 seconds)
        await cacheService.set(viewKey, true, 3600);

        console.log(
          `👁️ View count incremented (via downvote) for post ${id} by ${req.user.username}`,
        );
      }
    }
    if (alreadyDownvoted) {
      // Remove downvote
      post.downvotedBy = post.downvotedBy.filter(
        (id) => id.toString() !== userId.toString(),
      );
      post.downvotes -= 1;
    } else {
      // Add downvote
      post.downvotedBy.push(userId);
      post.downvotes += 1;

      // Remove upvote if exists
      if (alreadyUpvoted) {
        post.upvotedBy = post.upvotedBy.filter(
          (id) => id.toString() !== userId.toString(),
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
        author.reputation + (alreadyDownvoted ? 2 : -2),
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
      viewCount: post.viewCount,
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

    const cacheKey = `posts:tag:${tag}:${page}:${limit}:${req.user?._id || "guest"}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let posts = await Post.find({
      tags: tag,
      status: "published",
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("+upvotes +downvotes +upvotedBy +downvotedBy")
      .populate("authorId", "username avatar reputation")
      .lean();

    // Add isSaved status and vote data for authenticated users
    posts = await addSavedStatusToPosts(posts, req.user?._id);

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

    let posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("+upvotes +downvotes +upvotedBy +downvotedBy")
      .populate("authorId", "username avatar reputation")
      .lean();

    // Add isSaved status and vote data for authenticated users
    posts = await addSavedStatusToPosts(posts, req.user?._id);

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

// @route POST /api/posts/:id/save
exports.savePost = async (req, res) => {
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

    const user = await User.findById(userId);
    const alreadySaved = user.savedPosts.includes(id);

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter(
        (postId) => postId.toString() !== id.toString(),
      );
      post.savedBy = post.savedBy.filter((uid) => uid.toString());
      post.saveCount = Math.max(0, post.saveCount - 1);

      await user.save();
      await post.save();

      await cacheService.del(`post:${id}`);
      await cacheService.delPattern("posts:*");
      await cacheService.del(`user:${userId}`);

      return res.status(200).json({
        success: true,
        message: "Post unsaved",
        saved: false,
        saveCount: post.saveCount,
      });
    } else {
      user.savedPosts.push(id);
      post.savedBy.push(userId);
      post.saveCount += 1;

      await user.save();
      await post.save();

      // Clear caches
      await cacheService.del(`post:${id}`);
      await cacheService.delPattern("posts:*");
      await cacheService.del(`user:${userId}`);

      return res.status(200).json({
        success: true,
        message: "Post saved",
        saved: true,
        saveCount: post.saveCount,
      });
    }
  } catch (error) {
    console.error("Save post error:", error);
    res.status(500).json({
      success: false,
      message: "Error saving post",
      error: error.message,
    });
  }
};

// @route   GET /api/posts/saved
exports.getSavedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const total = user.savedPosts.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const savedPostIds = user.savedPosts.slice(skip, skip + parseInt(limit));

    let posts = await Post.find({
      _id: { $in: savedPostIds },
    })
      .select("+upvotes +downvotes +upvotedBy +downvotedBy")
      .populate("authorId", "username avatar reputation")
      .lean();

    // Sort posts by the order they appear in savedPosts
    const sortedPosts = savedPostIds
      .map((id) => posts.find((post) => post._id.toString() === id.toString()))
      .filter(Boolean);

    // Add computed fields
    const postsWithData = sortedPosts.map((post) => ({
      ...post,
      netVotes: (post.upvotes || 0) - (post.downvotes || 0),
      isSaved: true,
      userVote: post.upvotedBy?.includes(userId.toString())
        ? "upvote"
        : post.downvotedBy?.includes(userId.toString())
          ? "downvote"
          : null,
    }));

    res.status(200).json({
      success: true,
      posts: postsWithData,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalPosts: total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get saved posts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching saved posts",
      error: error.message,
    });
  }
};

// @route   GET /api/posts/:id/is-saved
exports.checkPostSaved = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isSaved = user.savedPosts.includes(id);

    res.status(200).json({
      success: true,
      saved: isSaved,
    });
  } catch (error) {
    console.error("Check post saved error:", error);
    res.status(500).json({
      success: false,
      message: "Error checking saved status",
      error: error.message,
    });
  }
};

const addSavedStatusToPosts = async (posts, userId) => {
  if (!userId) {
    return posts.map((post) => ({
      ...post,
      netVotes: (post.upvotes || 0) - (post.downvotes || 0),
      isSaved: false,
    }));
  }

  const user = await User.findById(userId);
  if (!user) {
    return posts.map((post) => ({
      ...post,
      netVotes: (post.upvotes || 0) - (post.downvotes || 0),
      isSaved: false,
    }));
  }

  return posts.map((post) => ({
    ...post,
    netVotes: (post.upvotes || 0) - (post.downvotes || 0),
    isSaved: user.savedPosts.some(
      (savedId) => savedId.toString() === post._id.toString(),
    ),
    userVote: post.upvotedBy?.includes(userId.toString())
      ? "upvote"
      : post.downvotedBy?.includes(userId.toString())
        ? "downvote"
        : null,
  }));
};

// @route   GET /api/posts/drafts/my-drafts
exports.getMyDrafts = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find drafts for this user
    const drafts = await Post.find({
      authorId: userId,
      status: "draft",
    })
      .sort({ updatedAt: -1 })
      .populate("authorId", "username avatar")
      .lean();

    // Calculate days remaining for each draft
    const draftsWithExpiry = drafts.map((draft) => {
      const draftAge =
        Date.now() -
        new Date(draft.draftCreatedAt || draft.createdAt).getTime();
      const daysRemaining = Math.max(
        0,
        3 - Math.floor(draftAge / (1000 * 60 * 60 * 24)),
      );

      return {
        ...draft,
        daysRemaining,
        expiresAt: new Date(
          new Date(draft.draftCreatedAt || draft.createdAt).getTime() +
            3 * 24 * 60 * 60 * 1000,
        ),
      };
    });

    res.status(200).json({
      success: true,
      drafts: draftsWithExpiry,
      count: draftsWithExpiry.length,
    });
  } catch (error) {
    console.error("Get drafts error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching drafts",
      error: error.message,
    });
  }
};

// @route   GET /api/posts/drafts/:id
exports.getDraftById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const draft = await Post.findOne({
      _id: id,
      authorId: userId,
      status: "draft",
    }).populate("authorId", "username avatar");

    if (!draft) {
      return res.status(404).json({
        success: false,
        message: "Draft not found or you do not have permission to access it",
      });
    }

    // Calculate days remaining
    const draftAge =
      Date.now() - new Date(draft.draftCreatedAt || draft.createdAt).getTime();
    const daysRemaining = Math.max(
      0,
      3 - Math.floor(draftAge / (1000 * 60 * 60 * 24)),
    );

    res.status(200).json({
      success: true,
      draft: {
        ...draft.toObject(),
        daysRemaining,
        expiresAt: new Date(
          new Date(draft.draftCreatedAt || draft.createdAt).getTime() +
            3 * 24 * 60 * 60 * 1000,
        ),
      },
    });
  } catch (error) {
    console.error("Get draft by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching draft",
      error: error.message,
    });
  }
};

// @route   DELETE /api/posts/drafts/cleanup
exports.cleanupOldDrafts = async (req, res) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const result = await Post.deleteMany({
      status: "draft",
      $or: [
        { draftCreatedAt: { $lte: threeDaysAgo } },
        {
          draftCreatedAt: null,
          createdAt: { $lte: threeDaysAgo },
        },
      ],
    });

    console.log(`🗑️  Cleaned up ${result.deletedCount} old drafts`);

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} old drafts`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Cleanup drafts error:", error);
    res.status(500).json({
      success: false,
      message: "Error cleaning up drafts",
      error: error.message,
    });
  }
};
