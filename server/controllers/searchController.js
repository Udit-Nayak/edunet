const searchService = require('../services/searchService');
const cacheService = require('../services/cacheService');

/**
 * @route   GET /api/search
 */
exports.search = async (req, res) => {
  try {
    const {
      q,
      cursor,
      limit = 15,
      type,
      tags,
      author,
      answered,
      sort = 'relevance',
      minUpvotes,
    } = req.query;

    // Validate search query
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters',
      });
    }

    // Build cache key (without cursor for first page)
    const cacheKey = cursor 
      ? null 
      : `search:${q}:${type || 'all'}:${tags || 'all'}:${author || 'all'}:${answered || 'all'}:${sort}:${minUpvotes || 0}`;

    // Check cache for first page only
    if (cacheKey) {
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(cachedData);
      }
    }

    // Perform search
    const result = await searchService.search({
      q: q.trim(),
      cursor,
      limit: parseInt(limit),
      type,
      tags,
      author,
      answered,
      sort,
      minUpvotes: minUpvotes ? parseInt(minUpvotes) : undefined,
      userId: req.user?._id,
    });

    const response = {
      success: true,
      query: q.trim(),
      posts: result.posts,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
      totalShown: result.posts.length,
      filters: {
        type: type || 'all',
        tags: tags ? tags.split(',') : [],
        author: author || null,
        answered: answered || 'all',
        sort,
      },
    };
    
    // Cache for only 60 seconds 
    if (cacheKey && !cursor) {
      await cacheService.set(cacheKey, response, 60);
    }

    res.status(200).json(response);
    
    console.log(`🔍 Search: "${q}" - ${result.posts.length} results`);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/search/suggestions
 */
exports.getSuggestions = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(200).json({
        success: true,
        suggestions: [],
      });
    }

    const cacheKey = `suggestions:${q.trim().toLowerCase()}`;
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      return res.status(200).json(cached);
    }

    const suggestions = await searchService.getSuggestions(q.trim());

    const response = {
      success: true,
      suggestions,
    };

    await cacheService.set(cacheKey, response, 300);

    res.status(200).json(response);
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suggestions',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/search/trending
 */
exports.getTrendingSearches = async (req, res) => {
  try {
    const cacheKey = 'trending:searches';
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.status(200).json(cached);
    }

    const trending = await searchService.getTrendingSearches();

    const response = {
      success: true,
      trending,
    };

    // Cache for 30 minutes
    await cacheService.set(cacheKey, response, 1800);

    res.status(200).json(response);
  } catch (error) {
    console.error('Trending searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending searches',
      error: error.message,
    });
  }
};

/**
 * @route   GET /api/search/popular-tags
 */
exports.getPopularTags = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const cacheKey = `popular:tags:${limit}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.status(200).json(cached);
    }

    const tags = await searchService.getPopularTags(parseInt(limit));

    const response = {
      success: true,
      tags,
    };

    // Cache for 30min
    await cacheService.set(cacheKey, response, 1800);

    res.status(200).json(response);
  } catch (error) {
    console.error('Popular tags error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular tags',
      error: error.message,
    });
  }
};

/**
 * @route   POST /api/search/track
 */
exports.trackSearch = async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search query',
      });
    }

    // Track asynchronously (don't wait)
    searchService.trackSearchQuery(query.trim()).catch(err => {
      console.error('Track search error:', err);
    });

    res.status(200).json({
      success: true,
      message: 'Search tracked',
    });
  } catch (error) {
    console.error('Track search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking search',
      error: error.message,
    });
  }
};