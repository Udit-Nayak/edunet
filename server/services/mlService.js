const axios = require("axios");
const Post = require("../models/Post");
const mongoose = require("mongoose");
const User = require("../models/User");
const cacheService = require("./cacheService");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const USE_NEURAL_RANKING = process.env.USE_NEURAL_RANKING !== 'false'; // Default true

class MLService {
  constructor() {
    this.client = axios.create({
      baseURL: ML_SERVICE_URL,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
    this.useNeuralRanking = USE_NEURAL_RANKING;
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

      // Get candidate posts
      const candidates = await Post.find({
        status: "published",
        _id: {
          $nin: viewedPostIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
        "mlMetadata.embedding": { $exists: true, $ne: null },
      })
        .limit(500) // Pre-filter to 500 candidates for neural ranking
        .lean();

      if (candidates.length === 0) {
        console.log("📈 No candidates - returning trending posts");
        return await this.getTrendingPosts(limit);
      }

      // Use neural ranking if enabled
      if (this.useNeuralRanking) {
        try {
          const rankedPosts = await this.neuralRankPosts(
            userVector,
            user.interests || [],
            candidates,
            limit,
          );
          
          if (rankedPosts && rankedPosts.length > 0) {
            console.log(`✅ Neural ranking: ${rankedPosts.length} posts`);
            return rankedPosts;
          }
        } catch (error) {
          console.error("Neural ranking failed, falling back to rule-based:", error);
        }
      }

      // Fallback to rule-based ranking (Phase 4 method)
      return await this.ruleBasedRanking(userVector, candidates, limit);
    } catch (error) {
      console.error("Personalized feed error:", error);
      return [];
    }
  }

  /**
   * Rank posts using neural ranking model
   */
  async neuralRankPosts(userVector, userInterests, candidatePosts, limit) {
    try {
      const response = await this.client.post("/api/ranking/neural-rank", {
        user_vector: userVector,
        user_interests: userInterests,
        candidate_posts: candidatePosts,
        limit: limit,
      });

      return response.data.posts;
    } catch (error) {
      console.error("Neural ranking error:", error);
      throw error;
    }
  }

  /**
   * Rule-based ranking (Phase 4 fallback)
   */
  async ruleBasedRanking(userVector, candidates, limit) {
    try {
      const personalizedPosts = await Post.aggregate([
        {
          $match: {
            _id: { $in: candidates.map((c) => c._id) },
            status: "published",
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
        {
          $addFields: {
            recencyScore: {
              $divide: [
                { $subtract: [new Date(), "$createdAt"] },
                1000 * 60 * 60 * 24,
              ],
            },
          },
        },
        {
          $addFields: {
            finalScore: {
              $add: [
                { $multiply: ["$similarity", 0.7] },
                { $multiply: [{ $divide: [1, "$recencyScore"] }, 0.2] },
                { $multiply: [{ $divide: ["$upvotes", 100] }, 0.1] },
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

      console.log(`✅ Rule-based ranking: ${personalizedPosts.length} posts`);
      return personalizedPosts;
    } catch (error) {
      console.error("Rule-based ranking error:", error);
      return [];
    }
  }

  /**
   * Check ranking service status
   */
  async getRankingStatus() {
    try {
      const response = await this.client.get("/api/ranking/status");
      return response.data;
    } catch (error) {
      console.error("Get ranking status error:", error);
      return { neural_ranker_available: false, ranking_method: "rule_based" };
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

  // ==================== Tag Suggestion Methods ====================

  /**
   * Suggest tags for text using ML classifier
   * @param {string} text - Title + content concatenated
   * @param {number} threshold - Minimum confidence (default: 0.3)
   * @param {number} top_k - Max suggestions (default: 5)
   * @returns {Promise<Array>} - Array of {tag, confidence}
   */
  async suggestTags(text, threshold = 0.3, top_k = 5) {
    try {
      const response = await this.client.post('/api/tags/suggest', {
        text,
        threshold,
        top_k
      });

      return response.data.suggestions || [];
    } catch (error) {
      console.error('Tag suggestion error:', error.message);
      
      if (error.response?.status === 503) {
        throw new Error('Tag classifier not available');
      }
      
      throw error;
    }
  }

  /**
   * Get all available tags from classifier
   * @returns {Promise<Object>} - {tags: [], count: number}
   */
  async getAllTags() {
    try {
      const response = await this.client.get('/api/tags/all');
      
      return {
        tags: response.data.tags || [],
        count: response.data.count || 0
      };
    } catch (error) {
      console.error('Get all tags error:', error.message);
      return { tags: [], count: 0 };
    }
  }

  /**
   * Get tag classifier status
   * @returns {Promise<Object>} - Status information
   */
  async getTagStatus() {
    try {
      const response = await this.client.get('/api/tags/status');
      
      return {
        tag_classifier_available: response.data.tag_classifier_available || false,
        num_tags: response.data.num_tags || 0,
        all_tags: response.data.all_tags || []
      };
    } catch (error) {
      console.error('Get tag status error:', error.message);
      return {
        tag_classifier_available: false,
        num_tags: 0,
        all_tags: []
      };
    }
  }

  /**
   * Reload tag classifier model
   * @returns {Promise<Object>} - Reload result
   */
  async reloadTagModel() {
    try {
      const response = await this.client.post('/api/tags/reload');
      
      return {
        message: response.data.message || 'Model reloaded',
        num_tags: response.data.num_tags || 0
      };
    } catch (error) {
      console.error('Reload tag model error:', error.message);
      throw error;
    }
  }

  // ==================== Collaborative Filtering Methods ====================

  /**
   * Get collaborative filtering recommendations
   * @param {string} userId - User ID
   * @param {Array<string>} candidatePostIds - Candidate post IDs
   * @param {number} limit - Max recommendations
   * @returns {Promise<Array>} - Array of {post_id, score}
   */
  async getCollaborativeRecommendations(userId, candidatePostIds, limit = 20) {
    try {
      const response = await this.client.post('/api/collaborative/recommend', {
        user_id: userId,
        candidate_post_ids: candidatePostIds,
        limit
      });

      return response.data.recommendations || [];
    } catch (error) {
      console.error('Collaborative recommendations error:', error.message);
      
      if (error.response?.status === 503) {
        throw new Error('Collaborative filter not available');
      }
      
      throw error;
    }
  }

  /**
   * Find users with similar taste
   * @param {string} userId - User ID
   * @param {number} topK - Number of similar users
   * @returns {Promise<Array>} - Array of {user_id, similarity}
   */
  async getSimilarUsers(userId, topK = 10) {
    try {
      const response = await this.client.post('/api/collaborative/similar-users', {
        user_id: userId,
        top_k: topK
      });

      return response.data.similar_users || [];
    } catch (error) {
      console.error('Similar users error:', error.message);
      return [];
    }
  }

  /**
   * Get collaborative filter status
   * @returns {Promise<Object>} - Status information
   */
  async getCollaborativeStatus() {
    try {
      const response = await this.client.get('/api/collaborative/status');
      
      return {
        available: response.data.available || false,
        num_users: response.data.num_users || 0,
        num_posts: response.data.num_posts || 0,
        embedding_dim: response.data.embedding_dim || 0
      };
    } catch (error) {
      console.error('Get CF status error:', error.message);
      return {
        available: false,
        num_users: 0,
        num_posts: 0,
        embedding_dim: 0
      };
    }
  }

  /**
   * Reload collaborative filter model
   * @returns {Promise<Object>} - Reload result
   */
  async reloadCollaborativeModel() {
    try {
      const response = await this.client.post('/api/collaborative/reload');
      
      return {
        message: response.data.message || 'Model reloaded',
        num_users: response.data.num_users || 0,
        num_posts: response.data.num_posts || 0
      };
    } catch (error) {
      console.error('Reload CF model error:', error.message);
      throw error;
    }
  }

  /**
   * Get hybrid recommendations (Content + Collaborative + Trending)
   * @param {string} userId - User ID
   * @param {number} limit - Total recommendations
   * @returns {Promise<Array>} - Array of posts
   */
  async getHybridRecommendations(userId, limit = 20, page = 1) {
    try {
      // Get user profile
      const user = await User.findById(userId).lean();
      if (!user) {
        return { posts: [], total: 0 };
      }

      // Generate a larger pool of personalized recommendations (first 200 posts)
      const personalizedPoolSize = 200;
      const skip = (page - 1) * limit;

      // Get total count of all published posts (excluding user's own)
      const totalPublishedPosts = await Post.countDocuments({
        status: 'published',
        authorId: { $ne: userId }
      });

      // If requesting beyond personalized pool, fall back to chronological
      if (skip >= personalizedPoolSize) {
        // Fetch chronological posts beyond the personalized pool
        const fallbackPosts = await Post.find({
          status: 'published',
          authorId: { $ne: userId }
        })
          .sort({ createdAt: -1 })
          .skip(skip - personalizedPoolSize)
          .limit(limit)
          .populate('authorId', 'username avatar reputation')
          .lean();

        return {
          posts: fallbackPosts,
          total: totalPublishedPosts
        };
      }

      // Get candidates for personalized recommendations
      const candidatePosts = await Post.find({
        status: 'published',
        authorId: { $ne: userId }
      })
        .sort({ createdAt: -1 })
        .limit(500) // Larger candidate pool
        .select('_id')
        .lean();

      const candidatePostIds = candidatePosts.map(p => p._id.toString());

      if (candidatePostIds.length === 0) {
        return { posts: [], total: 0 };
      }

      // Check if CF is available
      const cfStatus = await this.getCollaborativeStatus();
      
      let contentBasedPosts = [];
      let collaborativePosts = [];
      let trendingPosts = [];

      // 1. Content-based recommendations (60% of pool)
      const contentLimit = Math.floor(personalizedPoolSize * 0.6);
      try {
        const contentRecs = await this.neuralRankPosts(
          user.mlProfile?.embedding || [],
          user.interests || [],
          candidatePosts.map(p => ({ _id: p._id.toString() })),
          contentLimit
        );

        if (contentRecs && Array.isArray(contentRecs)) {
          contentBasedPosts = contentRecs.map(p => p.post_id || p._id);
        }
      } catch (error) {
        console.error('Content-based recommendations failed:', error.message);
      }

      // 2. Collaborative filtering (30% of pool)
      if (cfStatus.available) {
        const collaborativeLimit = Math.floor(personalizedPoolSize * 0.3);
        try {
          // Filter out already recommended posts
          const remainingCandidates = candidatePostIds.filter(
            id => !contentBasedPosts.includes(id)
          );

          const cfRecs = await this.getCollaborativeRecommendations(
            userId,
            remainingCandidates,
            collaborativeLimit
          );

          collaborativePosts = cfRecs.map(r => r.post_id);
        } catch (error) {
          console.error('Collaborative recommendations failed:', error.message);
        }
      }

      // 3. Trending posts (10% of pool)
      const trendingLimit = Math.floor(personalizedPoolSize * 0.1);
      try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const trending = await Post.find({
          status: 'published',
          authorId: { $ne: userId },
          createdAt: { $gte: sevenDaysAgo },
          _id: {
            $nin: [
              ...contentBasedPosts.map(id => new mongoose.Types.ObjectId(id)),
              ...collaborativePosts.map(id => new mongoose.Types.ObjectId(id))
            ]
          }
        })
          .sort({ upvotes: -1, viewCount: -1 })
          .limit(trendingLimit)
          .select('_id')
          .lean();

        trendingPosts = trending.map(p => p._id.toString());
      } catch (error) {
        console.error('Trending posts failed:', error.message);
      }

      // Combine all recommendations
      const allPostIds = [
        ...contentBasedPosts,
        ...collaborativePosts,
        ...trendingPosts
      ];

      // Remove duplicates to get full pool
      const uniquePostIds = [...new Set(allPostIds)];

      // Apply pagination
      const paginatedPostIds = uniquePostIds.slice(skip, skip + limit);

      // Fetch full post details for the paginated posts
      const posts = await Post.find({
        _id: { $in: paginatedPostIds.map(id => new mongoose.Types.ObjectId(id)) }
      })
        .populate('authorId', 'username avatar reputation')
        .lean();

      // Sort posts in the order of recommendation
      const sortedPosts = paginatedPostIds
        .map(id => posts.find(p => p._id.toString() === id))
        .filter(p => p !== undefined);

      // Return total as all published posts (personalized pool + remaining posts)
      return {
        posts: sortedPosts,
        total: totalPublishedPosts
      };
      
    } catch (error) {
      console.error('Hybrid recommendations error:', error);
      return { posts: [], total: 0 };
    }
  }

  // ========================================
  // Phase 8: Fast Similarity Search (ANN)
  // ========================================

  /**
   * Find similar posts using fast ANN index (Phase 8)
   * ~50-100x faster than naive similarity search
   * 
   * @param {string} postId - Post ID to find similar posts for
   * @param {number} limit - Number of similar posts to return
   * @param {boolean} includeFullDetails - Whether to include full post details
   * @returns {Promise<Array>} - Array of similar posts
   */
  async findSimilarPostsFast(postId, limit = 10, includeFullDetails = false) {
    try {
      if (!postId) {
        throw new Error('Post ID is required');
      }

      const response = await this.client.post('/api/similarity/fast', {
        post_id: postId,
        limit: limit,
        include_full_details: includeFullDetails
      });

      return {
        queryPostId: response.data.query_post_id,
        similarPosts: response.data.similar_posts || [],
        count: response.data.count || 0,
        method: response.data.method || 'ann_index',
        speedup: response.data.speedup || '~50-100x faster'
      };
    } catch (error) {
      if (error.response?.status === 503) {
        console.warn('ANN index not available. Build it with: python -m app.training.build_ann_index');
        throw new Error('Fast similarity search not available. ANN index not built.');
      }
      console.error('Fast similarity search error:', error.message);
      throw error;
    }
  }

  /**
   * Get ANN index status
   * @returns {Promise<Object>} - Index status and statistics
   */
  async getANNIndexStatus() {
    try {
      const response = await this.client.get('/api/similarity/status');

      return {
        status: response.data.status || 'unknown',
        annIndex: response.data.ann_index || null,
        database: response.data.database || null,
        performance: response.data.performance || null,
        message: response.data.message || null
      };
    } catch (error) {
      console.error('Get ANN status error:', error.message);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Reload ANN index (after rebuilding)
   * @returns {Promise<Object>} - Reload result
   */
  async reloadANNIndex() {
    try {
      const response = await this.client.post('/api/similarity/reload');

      return {
        message: response.data.message || 'Index reloaded',
        numPosts: response.data.num_posts || 0,
        buildTime: response.data.build_time || null,
        hint: response.data.hint || null
      };
    } catch (error) {
      console.error('Reload ANN index error:', error.message);
      throw error;
    }
  }

  /**
   * Get similar posts with full details from database
   * Combines fast ANN search with MongoDB population
   * 
   * @param {string} postId - Post ID
   * @param {number} limit - Number of similar posts
   * @returns {Promise<Array>} - Array of populated posts
   */
  async getSimilarPostsWithDetails(postId, limit = 10) {
    try {
      // Use fast ANN search
      const result = await this.findSimilarPostsFast(postId, limit, false);

      if (!result.similarPosts || result.similarPosts.length === 0) {
        return [];
      }

      // Extract post IDs
      const postIds = result.similarPosts.map(p => p.post_id);

      // Fetch full post details from database
      const posts = await Post.find({
        _id: { $in: postIds.map(id => new mongoose.Types.ObjectId(id)) }
      })
        .populate('authorId', 'username avatar reputation')
        .lean();

      // Merge with similarity scores
      const postsWithSimilarity = postIds
        .map(id => {
          const post = posts.find(p => p._id.toString() === id);
          const similarPost = result.similarPosts.find(s => s.post_id === id);
          
          if (post && similarPost) {
            return {
              ...post,
              similarity: similarPost.similarity
            };
          }
          return null;
        })
        .filter(p => p !== null);

      return postsWithSimilarity;
    } catch (error) {
      console.error('Get similar posts with details error:', error);
      return [];
    }
  }
}

module.exports = new MLService();