const Post = require("../models/Post");
const User = require("../models/User");
const cacheService = require("./cacheService");
const { parseCursor, generateCursor } = require("../utils/searchHelpers");

class SearchService {
  async search(params) {
    const {
      q,
      cursor,
      limit = 15,
      type,
      tags,
      author,
      answered,
      sort = "relevance",
      minUpvotes,
      userId,
    } = params;

    const query = this.buildSearchQuery(q, {
      cursor,
      type,
      tags,
      author,
      answered,
      minUpvotes,
    });

    const sortOptions = this.buildSortOptions(sort, q);

    const posts = await Post.find(query)
      .select("+upvotes +downvotes +upvotedBy +downvotedBy")
      .sort(sortOptions)
      .limit(limit + 1)
      .populate("authorId", "username avatar reputation")
      .lean();

    const hasMore = posts.length > limit;
    const results = hasMore ? posts.slice(0, -1) : posts;

    const postsWithData = await this.enrichPosts(results, userId);

    const nextCursor = hasMore
      ? generateCursor(results[results.length - 1])
      : null;

    return {
      posts: postsWithData,
      hasMore,
      nextCursor,
    };
  }

  buildSearchQuery(searchText, filters) {
    const { cursor, type, tags, author, answered, minUpvotes } = filters;

    // Build flexible search query - partial matching
    const query = {
      status: 'published',
    };

    // Use regex for partial text matching instead of strict $text search
    if (searchText && searchText.trim()) {
      const searchRegex = new RegExp(searchText.trim().split(/\s+/).join('|'), 'i');
      query.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Handle post type filter
    if (type && type !== 'all') {
      query.type = type;
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query.tags = { $in: tagArray };
    }

    if (author) {
      query.authorId = author;
    }

    // Answered filter - ONLY applies to questions
    // Don't apply if type is specifically set to 'note' or 'article'
    if (answered !== 'all' && type !== 'note' && type !== 'article') {
      if (answered === 'true') {
        // Show only answered questions
        if (type === 'all') {
          // If type is 'all', we need to add type filter
          query.type = 'question';
        }
        query.answerCount = { $gt: 0 };
      } else if (answered === 'false') {
        // Show only unanswered questions
        if (type === 'all') {
          // If type is 'all', we need to add type filter
          query.type = 'question';
        }
        query.answerCount = 0;
      }
    }

    if (minUpvotes) {
      query.upvotes = { $gte: parseInt(minUpvotes) };
    }

    if (cursor) {
      const { timestamp, id } = parseCursor(cursor);
      query.$or = [
        { createdAt: { $lt: new Date(timestamp) } },
        {
          createdAt: new Date(timestamp),
          _id: { $lt: id },
        },
      ];
    }

    return query;
  }

  buildSortOptions(sort, searchText) {
    switch (sort) {
      case 'relevance':
        // For relevance, prioritize exact matches, then upvotes, then recent
        return {
          upvotes: -1,
          viewCount: -1,
          createdAt: -1,
        };
      case 'recent':
        return { createdAt: -1 };
      case 'popular':
        return { upvotes: -1, viewCount: -1, createdAt: -1 };
      case 'trending':
        return { viewCount: -1, upvotes: -1, createdAt: -1 };
      default:
        return { createdAt: -1 };
    }
  }

  async enrichPosts(posts, userId) {
    if (!userId) {
      return posts.map(post => ({
        ...post,
        netVotes: (post.upvotes || 0) - (post.downvotes || 0),
        isSaved: false,
        userVote: null,
      }));
    }

    const user = await User.findById(userId);
    if (!user) {
      return posts.map(post => ({
        ...post,
        netVotes: (post.upvotes || 0) - (post.downvotes || 0),
        isSaved: false,
        userVote: null,
      }));
    }

    return posts.map(post => ({
      ...post,
      netVotes: (post.upvotes || 0) - (post.downvotes || 0),
      isSaved: user.savedPosts.some(
        savedId => savedId.toString() === post._id.toString()
      ),
      userVote: post.upvotedBy?.includes(userId.toString())
        ? 'upvote'
        : post.downvotedBy?.includes(userId.toString())
          ? 'downvote'
          : null,
    }));
  }

  async getSuggestions(query) {
    try {
      // Use regex for partial matching
      const searchRegex = new RegExp(query.trim(), 'i');
      
      const titleMatches = await Post.find({
        title: searchRegex,
        status: 'published',
      })
        .select('title')
        .limit(5)
        .lean();

      const tagMatches = await Post.aggregate([
        { $match: { status: 'published' } },
        { $unwind: '$tags' },
        {
          $match: {
            tags: searchRegex,
          },
        },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]);

      const suggestions = [
        ...titleMatches.map(p => ({
          type: 'post',
          text: p.title,
          icon: '📄',
        })),
        ...tagMatches.map(t => ({
          type: 'tag',
          text: t._id,
          icon: '🏷️',
          count: t.count,
        })),
      ];

      return suggestions.slice(0, 8);
    } catch (error) {
      console.error('Get suggestions error:', error);
      return [];
    }
  }

  async getTrendingSearches() {
    try {
      const trending = await Post.aggregate([
        {
          $match: {
            status: 'published',
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      return trending.map(t => ({
        query: t._id,
        count: t.count,
      }));
    } catch (error) {
      console.error('Get trending searches error:', error);
      return [];
    }
  }

  async getPopularTags(limit = 20) {
    try {
      const tags = await Post.aggregate([
        { $match: { status: 'published' } },
        { $unwind: '$tags' },
        {
          $group: {
            _id: '$tags',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ]);

      return tags.map(t => ({
        name: t._id,
        count: t.count,
      }));
    } catch (error) {
      console.error('Get popular tags error:', error);
      return [];
    }
  }

  async trackSearchQuery(query) {
    try {
      const key = `search:count:${query.toLowerCase()}`;
      await cacheService.setNoExpiry(key, {
        query,
        count: 1,
        lastSearched: new Date(),
      });
    } catch (error) {
      console.error('Track search query error:', error);
    }
  }
}

module.exports = new SearchService();