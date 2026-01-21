/**
 * Generate cursor for pagination
 * Format: base64(timestamp_postId)
 */
exports.generateCursor= (post)=>{
    if(!post)return numm;

    const timestamp=new Date(post.createdAt).getTime();
    const cursorString=`${timestamp}_${post._id}`;
    return Buffer.from(cursorString).toString('base64');
};

/**
 * Parse cursor to get timestamp and post ID
 */
exports.parseCursor=(cursor)=>{
    try {
        const decoded=Buffer.from(cursor, 'base64').toString('utf-8');
        const [timestamp, id]=decoded.split('_');

        return{
            timestamp:parseInt(timestamp),
            id,
        };
    } catch (error) {
        console.error('Parse cursor error:', error);
        return {timestamp: Date.now(), id:null};
    }
};


/**
 * Sanitize search query
 * Remove special characters that could break MongoDB text search
 */
exports.sanitizeSearchQuery=(query)=>{
    if(!query)return '';

    return query.trim().replace(/[^\w\s-]/g, ''). replace(/\s+/g, ' ').slice(0, 100);
};

/**
 * Parse filter string to array
 * Example: "javascript,react,nodejs" → ["javascript", "react", "nodejs"]
 */
exports.parseFilterArray = (filterString) => {
  if (!filterString) return [];
  
  return filterString
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(item => item.length > 0);
};


/**
 * Build query string from filters
 * For constructing URLs
 */
exports.buildQueryString = (filters) => {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        params.append(key, value.join(','));
      } else {
        params.append(key, value);
      }
    }
  });
  
  return params.toString();
};


/**
 * Highlight search terms in text
 * Returns text with <mark> tags around matches
 */
exports.highlightSearchTerms = (text, searchQuery) => {
  if (!text || !searchQuery) return text;
  
  const terms = searchQuery.split(' ').filter(term => term.length > 2);
  let highlighted = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  
  return highlighted;
};

/**
 * Extract snippet from content for search results
 * Returns excerpt with search term context
 */
exports.extractSearchSnippet = (content, searchQuery, maxLength = 200) => {
  if (!content) return '';
  
  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, '');
  
  // Find first occurrence of search term
  const terms = searchQuery.toLowerCase().split(' ');
  let snippetStart = 0;
  
  for (const term of terms) {
    const index = plainText.toLowerCase().indexOf(term);
    if (index !== -1) {
      // Start snippet 50 chars before the match
      snippetStart = Math.max(0, index - 50);
      break;
    }
  }
  
  // Extract snippet
  let snippet = plainText.slice(snippetStart, snippetStart + maxLength);
  
  // Add ellipsis if needed
  if (snippetStart > 0) snippet = '...' + snippet;
  if (snippetStart + maxLength < plainText.length) snippet = snippet + '...';
  
  return snippet.trim();
};

/**
 * Validate search filters
 */
exports.validateFilters = (filters) => {
  const errors = [];
  
  // Validate type
  if (filters.type && !['all', 'question', 'note', 'article'].includes(filters.type)) {
    errors.push('Invalid post type');
  }
  
  // Validate answered
  if (filters.answered && !['all', 'true', 'false'].includes(filters.answered)) {
    errors.push('Invalid answered filter');
  }
  
  // Validate sort
  if (filters.sort && !['relevance', 'recent', 'popular', 'trending'].includes(filters.sort)) {
    errors.push('Invalid sort option');
  }
  
  // Validate limit
  if (filters.limit) {
    const limit = parseInt(filters.limit);
    if (isNaN(limit) || limit < 1 || limit > 50) {
      errors.push('Limit must be between 1 and 50');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Format search results for response
 */
exports.formatSearchResults = (posts, searchQuery) => {
  return posts.map(post => ({
    ...post,
    snippet: exports.extractSearchSnippet(post.content, searchQuery),
    highlightedTitle: exports.highlightSearchTerms(post.title, searchQuery),
  }));
};

/**
 * Get search filter summary for display
 */
exports.getFilterSummary = (filters) => {
  const summary = [];
  if (filters.type && filters.type !== 'all') {
    summary.push(`Type: ${filters.type}`);
  }
  if (filters.tags && filters.tags.length > 0) {
    summary.push(`Tags: ${filters.tags.join(', ')}`);
  }
  if (filters.answered === 'true') {
    summary.push('Answered questions');
  } else if (filters.answered === 'false') {
    summary.push('Unanswered questions');
  }
  if (filters.author) {
    summary.push('By specific author');
  }
  return summary.join(' • ');
};