const axios = require("axios");
const Post = require("../models/Post");
const mongoose = require("mongoose");
const User = require("../models/User");
const cacheService = require("./cacheService");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
class MLService {
  constructor() {
    this.client = axios.create({
      baseURL: ML_SERVICE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  async checkHealth() {
    try {
      const response = await this.client.get("/health");
      return response.data.status === "healthy";
    } catch (error) {
      console.error("ML service health check failed:", error.message);
      return false;
    }
  }
  async getSimilarPosts(postId, limit = 10) {
    try {
      const response = await axios.post(
        `${ML_SERVIE_URL}/api/recomment/similar`,
        { post_id: postId, limit },
      );
      return response.data.posts;
    } catch (error) {
      console.error("ML Service error:", error.message);
      return [];
    }
  }

  async generateEmbedding(text) {
    try {
      const response = await this.client.post("/api/embeddings/generate", {
        text,
      });
      return response.data.embedding;
    } catch (error) {
      console.error("ML Service embedding error:", error.message);
      return null;
    }
  }

  async generateBatchEmbeddings(texts) {
    try {
      const response = await this.client.post("/api/embeddings/batch", {
        texts,
      });
      return response.data.embeddings;
    } catch (error) {
      console.error("ML Service batch embedding error:", error.message);
      return [];
    }
  }

  async generatePostEmbedding(title, content, tags = []) {
    const text = `${title} ${title} ${content} ${tags.join(" ")}`;
    return await this.generateEmbedding(text);
  }

  async getSimilarPosts(postId, limit = 5) {
    try {
      // 1. Try cache first
      const cacheKey = `similar:${postId}:${limit}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return cached;
      }

      // 2. Get the post's embedding from DB
      const post = await Post.findById(postId).select("mlMetadata.embedding");

      if (!post || !post.mlMetadata?.embedding) {
        console.log(`No embedding found for post ${postId}`);
        return [];
      }

      const embedding = post.mlMetadata.embedding;

      // 3. Find similar posts using MongoDB aggregation
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
              // Compute cosine similarity
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
            _id: 1,
            title: 1,
            type: 1,
            tags: 1,
            viewCount: 1,
            upvotes: 1,
            createdAt: 1,
            "authorId.username": 1,
            "authorId.avatar": 1,
            similarity: 1,
          },
        },
      ]);

      // 4. Cache for 1 hour
      await cacheService.set(cacheKey, similarPosts, 3600);

      return similarPosts;
    } catch (error) {
      console.error("Get similar posts error:", error);
      return [];
    }
  }

  /**
   * Semantic search for posts
   */
  async searchPosts(query, limit = 10) {
    try {
      // 1. Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      if (!queryEmbedding) {
        return [];
      }

      // 2. Find similar posts
      const results = await Post.aggregate([
        {
          $match: {
            status: "published",
            "mlMetadata.embedding": { $exists: true, $ne: null },
          },
        },
        {
          $addFields: {
            similarity: {
              $reduce: {
                input: { $range: [0, queryEmbedding.length] },
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $multiply: [
                        { $arrayElemAt: ["$mlMetadata.embedding", "$$this"] },
                        { $arrayElemAt: [queryEmbedding, "$$this"] },
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
            _id: 1,
            title: 1,
            content: 1,
            type: 1,
            tags: 1,
            viewCount: 1,
            upvotes: 1,
            createdAt: 1,
            "authorId.username": 1,
            "authorId.avatar": 1,
            similarity: 1,
          },
        },
      ]);

      return results;
    } catch (error) {
      console.error("Semantic search error:", error);
      return [];
    }
  }

  async computeUserVector(userId) {
    try {
      const user = await User.findById(userId).select("userInteractions");

      if (!user) {
        return null;
      }

      const interactions = user.userInteractions || {};

      // 1. Collect posts with embeddings
      const viewedPostIds = (interactions.viewedPosts || [])
        .slice(-50) // Last 50 views
        .map((v) => v.postId);

      const upvotedPostIds = (interactions.upvotedPosts || []).map(
        (v) => v.postId,
      );

      const savedPostIds = user.savedPosts || [];

      // 2. Get embeddings from DB
      const [viewedPosts, upvotedPosts, savedPosts] = await Promise.all([
        Post.find({
          _id: { $in: viewedPostIds },
          "mlMetadata.embedding": { $exists: true },
        }).select("mlMetadata.embedding"),

        Post.find({
          _id: { $in: upvotedPostIds },
          "mlMetadata.embedding": { $exists: true },
        }).select("mlMetadata.embedding"),

        Post.find({
          _id: { $in: savedPostIds },
          "mlMetadata.embedding": { $exists: true },
        }).select("mlMetadata.embedding"),
      ]);

      // 3. Prepare data for ML service
      const requestData = {
        viewed_posts: viewedPosts.map((p) => ({
          embedding: p.mlMetadata.embedding,
        })),
        upvoted_posts: upvotedPosts.map((p) => ({
          embedding: p.mlMetadata.embedding,
        })),
        saved_posts: savedPosts.map((p) => ({
          embedding: p.mlMetadata.embedding,
        })),
      };

      // 4. Call ML service to compute vector
      const response = await this.client.post(
        "/api/user/compute-vector",
        requestData,
      );

      return response.data.vector;
    } catch (error) {
      console.error("Compute user vector error:", error);
      return null;
    }
  }

  /**
   * Update user vector with new interaction (online learning)
   */
  async updateUserVectorOnline(userId, postId, interactionType) {
    try {
      const user = await User.findById(userId).select("mlProfile");
      const post = await Post.findById(postId).select("mlMetadata.embedding");

      if (!user || !post || !post.mlMetadata?.embedding) {
        return null;
      }

      const currentVector = user.mlProfile?.embedding || null;

      if (!currentVector) {
        // If no existing vector, compute from scratch
        return await this.computeUserVector(userId);
      }

      // Determine interaction weight
      let weight = 0.3; // view
      if (interactionType === "upvote") weight = 0.7;
      if (interactionType === "save") weight = 1.0;

      // Call ML service to update vector
      const response = await this.client.post("/api/user/update-vector", {
        current_vector: currentVector,
        new_post_embedding: post.mlMetadata.embedding,
        interaction_weight: weight,
      });

      return response.data.vector;
    } catch (error) {
      console.error("Update user vector error:", error);
      return null;
    }
  }

  /**
   * Get cold start vector for new users based on interests
   * Enhanced version: uses top posts from selected tags when available
   */
  async getColdStartVector(interestTags, userId = null) {
    try {
      if (!interestTags || interestTags.length === 0) {
        return null;
      }

      // Get top posts from interest tags
      const topPosts = await Post.find({
        status: "published",
        tags: { $in: interestTags },
        "mlMetadata.embedding": { $exists: true, $ne: null },
      })
        .sort({ upvotes: -1, viewCount: -1 })
        .limit(10) // Top 10 posts per tag
        .select("mlMetadata.embedding")
        .lean();

      if (topPosts.length > 0) {
        // Use embeddings from actual top posts
        const embeddings = topPosts.map((p) => p.mlMetadata.embedding);

        const response = await this.client.post(
          "/api/user/cold-start-from-posts",
          {
            top_posts_embeddings: embeddings,
          },
        );

        console.log(
          `✅ Cold start vector created from ${topPosts.length} top posts`,
        );
        return response.data.vector;
      } else {
        // Fallback: use tag text if no posts available
        const response = await this.client.post(
          "/api/user/cold-start-from-tags",
          {
            interest_tags: interestTags,
          },
        );

        console.log(
          `✅ Cold start vector created from tags (no posts available)`,
        );
        return response.data.vector;
      }
    } catch (error) {
      console.error("Cold start vector error:", error);
      return null;
    }
  }

  // ============= PERSONALIZED FEED =============

  /**
   * Get personalized feed for user
   */
  async getPersonalizedFeed(userId, limit = 20) {
    try {
      const user = await User.findById(userId).select(
        "mlProfile interests userInteractions",
      );

      if (!user) {
        return [];
      }

      let userVector = user.mlProfile?.embedding;

      // Check if user needs vector update (first 3 interactions)
      const shouldUpdateVector = await this.shouldUpdateNewUserVector(
        userId,
        user,
      );

      if (shouldUpdateVector) {
        console.log("🔄 New user - updating vector after initial interactions");
        userVector = await this.computeUserVector(userId);
        if (userVector) {
          await User.findByIdAndUpdate(userId, {
            $set: {
              "mlProfile.embedding": userVector,
              "mlProfile.lastUpdated": new Date(),
            },
          });
        }
      }

      // Cold start: use interests if no vector
      if (!userVector && user.interests && user.interests.length > 0) {
        console.log("🆕 Cold start - generating vector from interests");
        userVector = await this.getColdStartVector(user.interests, userId);

        // Save cold start vector
        if (userVector) {
          await User.findByIdAndUpdate(userId, {
            $set: {
              "mlProfile.embedding": userVector,
              "mlProfile.lastUpdated": new Date(),
            },
          });
        }
      }

      if (!userVector) {
        // No vector and no interests - return trending posts
        console.log("📈 No vector - returning trending posts");
        return await this.getTrendingPosts(limit);
      }

      // Get recently viewed posts to exclude
      const viewedPostIds = (user.userInteractions?.viewedPosts || [])
        .slice(-100)
        .map((v) => v.postId);

      // Find posts similar to user vector
      const personalizedPosts = await Post.aggregate([
        {
          $match: {
            status: "published",
            _id: {
              $nin: viewedPostIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
            "mlMetadata.embedding": { $exists: true, $ne: null },
          },
        },
        {
          $addFields: {
            similarity: {
              $reduce: {
                input: { $range: [0, userVector.length] },
                initialValue: 0,
                in: {
                  $add: [
                    "$$value",
                    {
                      $multiply: [
                        { $arrayElemAt: ["$mlMetadata.embedding", "$$this"] },
                        { $arrayElemAt: [userVector, "$$this"] },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        // Boost recent posts
        {
          $addFields: {
            recencyScore: {
              $divide: [
                { $subtract: [new Date(), "$createdAt"] },
                1000 * 60 * 60 * 24, // Days
              ],
            },
          },
        },
        {
          $addFields: {
            finalScore: {
              $add: [
                { $multiply: ["$similarity", 0.7] }, // 70% similarity
                { $multiply: [{ $divide: [1, "$recencyScore"] }, 0.2] }, // 20% recency
                { $multiply: [{ $divide: ["$upvotes", 100] }, 0.1] }, // 10% popularity
              ],
            },
          },
        },
        { $sort: { finalScore: -1 } },
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
            _id: 1,
            title: 1,
            content: 1,
            type: 1,
            tags: 1,
            viewCount: 1,
            upvotes: 1,
            answerCount: 1,
            createdAt: 1,
            "authorId._id": 1,
            "authorId.username": 1,
            "authorId.avatar": 1,
            "authorId.reputation": 1,
            similarity: 1,
            finalScore: 1,
          },
        },
      ]);

      return personalizedPosts;
    } catch (error) {
      console.error("Personalized feed error:", error);
      return [];
    }
  }

  // ============= BACKGROUND JOBS =============

  /**
   * Check if new user needs vector update after first 3 interactions
   */
  async shouldUpdateNewUserVector(userId, user = null) {
    try {
      if (!user) {
        user = await User.findById(userId).select(
          "mlProfile userInteractions createdAt",
        );
      }

      if (!user) return false;

      // If vector was already updated, don't update again
      if (user.mlProfile?.lastUpdated) {
        const daysSinceUpdate =
          (Date.now() - new Date(user.mlProfile.lastUpdated).getTime()) /
          (1000 * 60 * 60 * 24);

        // Only update if it's been more than 1 day
        if (daysSinceUpdate < 1) {
          return false;
        }
      }

      // Check if user is new (created in last 7 days)
      const daysSinceCreation =
        (Date.now() - new Date(user.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSinceCreation > 7) {
        return false; // Not a new user
      }

      // Count significant interactions (upvotes, saves, answers)
      const upvoteCount = user.userInteractions?.upvotedPosts?.length || 0;
      const saveCount = user.savedPosts?.length || 0;

      const totalSignificantInteractions = upvoteCount + saveCount;

      // Update after 3+ significant interactions for new users without a vector
      if (totalSignificantInteractions >= 3 && !user.mlProfile?.embedding) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Should update new user vector check error:", error);
      return false;
    }
  }

  /**
   * Get trending posts (fallback for users with no vector)
   */
  async getTrendingPosts(limit = 20) {
    try {
      // Get posts from last 7 days, sorted by engagement
      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      );

      return await Post.find({
        status: "published",
        createdAt: { $gte: sevenDaysAgo },
      })
        .sort({ upvotes: -1, viewCount: -1, answerCount: -1 })
        .limit(limit)
        .populate("authorId", "username avatar reputation")
        .lean();
    } catch (error) {
      console.error("Get trending posts error:", error);
      return [];
    }
  }

  /**
   * Update user vector in background
   * Should be called after significant interactions
   */
  async updateUserVectorBackground(userId) {
    try {
      const userVector = await this.computeUserVector(userId);

      if (userVector) {
        await User.findByIdAndUpdate(userId, {
          $set: {
            "mlProfile.embedding": userVector,
            "mlProfile.lastUpdated": new Date(),
          },
        });

        console.log(`✅ Updated user vector for ${userId}`);
      }
    } catch (error) {
      console.error("Background user vector update error:", error);
    }
  }
}

module.exports = new MLService();