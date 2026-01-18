const Post = require("../models/Post");
const Answer = require("../models/Answer");
const User = require("../models/User");
const cacheService = require("../services/cacheService");
const storageService = require("../services/storageService");
const reputationService = require("../services/reputationService");
const notificationService = require("../services/notificationService");

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
      status: "published",
    });

    await reputationService.checkPostMilestone(req.user._id, userPostCount);

    (res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: post.getPublicData(),
    }),
      console.log(`✅ New ${type} created by ${req.user.username}`));
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

    const cacheKey = `posts:${JSON.stringify(query)}:${sortBy}:${page}:${limit}:${req.user?._id || 'guest'}`;
    const cachedData = await cacheService.get(cacheKey);

    if (cachedData) {
      return res.status(200).json(cachedData);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    let posts = await Post.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("authorId", "username avatar reputation")
      .lean();

    // Add isSaved status for authenticated users
    if (req.user) {
      posts = await addSavedStatusToPosts(posts, req.user._id);
    }

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
    const { incrementView } = req.query; // Add this parameter

    const cacheKey = `post:${id}`;
    const cachedPost = await cacheService.get(cacheKey);

    let post;

    if (cachedPost) {
      post = await Post.findById(id).populate(
        "authorId",
        "username avatar reputation bio",
      );
    } else {
      post = await Post.findById(id).populate(
        "authorId",
        "username avatar reputation bio",
      );

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

    // Only increment view count when explicitly requested from the post detail page
    // AND user is not the author
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

const postData = post.getPublicData(req.user ? req.user._id : null);

    // Cache for 5 minutes

    if (req.user) {
  const user = await User.findById(req.user._id);
  postData.isSaved = user.savedPosts.includes(id);
}

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

    const cacheKey = `posts:tag:${tag}:${page}:${limit}:${req.user?._id || 'guest'}`;
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
      .populate("authorId", "username avatar reputation")
      .lean();

    // Add isSaved status for authenticated users
    if (req.user) {
      posts = await addSavedStatusToPosts(posts, req.user._id);
    }

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
      .populate("authorId", "username avatar reputation")
      .lean();

    // Add isSaved status for authenticated users
    if (req.user) {
      posts = await addSavedStatusToPosts(posts, req.user._id);
    }

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
exports.savePost= async (req, res)=>{
  try {
    const {id}=req.params;
    const userId=req.user._id;

    const post=await Post.findById(id);

    if(!post){
      return res.status(404).json({
        success:false,
        message:'Post not found',
      });
    }

    const user= await User.findById(userId);
    const alreadySaved= user.savedPosts.includes(id);

    if(alreadySaved){
      user.savedPosts=user.savedPosts.filter(
        (postId)=>postId.toString()!== id.toString()
      );
      post.savedBy=post.savedBy.filter((uid)=>uid.toString());
      post.saveCount=Math.max(0, post.saveCount-1);

      await user.save();
      await post.save();

      await cacheService.del(`post:${id}`);
      await cacheService.delPattern('posts:*');
      await cacheService.del(`user:${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Post unsaved',
        saved: false,
        saveCount: post.saveCount,
      });
    }
    else{
      user.savedPosts.push(id);
      post.savedBy.push(userId);
      post.saveCount += 1;

      await user.save();
      await post.save();

      // Clear caches
      await cacheService.del(`post:${id}`);
      await cacheService.delPattern('posts:*');
      await cacheService.del(`user:${userId}`);

      return res.status(200).json({
        success: true,
        message: 'Post saved',
        saved: true,
        saveCount: post.saveCount,
      });
    }
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving post',
      error: error.message,
    });
  }
}

// @route   GET /api/posts/saved
exports.getSavedPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const total = user.savedPosts.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const savedPostIds = user.savedPosts.slice(skip, skip + parseInt(limit));

    let posts = await Post.find({
      _id: { $in: savedPostIds },
    })
      .populate('authorId', 'username avatar reputation')
      .lean();

    // Sort posts by the order they appear in savedPosts
    const sortedPosts = savedPostIds.map(id => 
      posts.find(post => post._id.toString() === id.toString())
    ).filter(Boolean);

    // Add isSaved flag (should always be true for saved posts)
    const postsWithSavedStatus = sortedPosts.map(post => ({
      ...post,
      isSaved: true
    }));

    res.status(200).json({
      success: true,
      posts: postsWithSavedStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalPosts: total,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching saved posts',
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
        message: 'User not found',
      });
    }

    const isSaved = user.savedPosts.includes(id);

    res.status(200).json({
      success: true,
      saved: isSaved,
    });
  } catch (error) {
    console.error('Check post saved error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking saved status',
      error: error.message,
    });
  }
};

const addSavedStatusToPosts = async (posts, userId) => {
  if (!userId) return posts;

  const user = await User.findById(userId);
  if (!user) return posts;

  return posts.map(post => ({
    ...post,
    isSaved: user.savedPosts.some(savedId => savedId.toString() === post._id.toString())
  }));
};