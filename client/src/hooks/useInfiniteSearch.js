import { useState, useEffect, useCallback, useRef } from 'react';
import { searchAPI } from '../services/api';
import toast from 'react-hot-toast';

export const useInfiniteSearch = (query, filters = {}) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [error, setError] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Use ref to avoid dependency issues
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Update refs when state changes
  useEffect(() => {
    loadingRef.current = loading;
    hasMoreRef.current = hasMore;
  }, [loading, hasMore]);

  // Load more results
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current || !query) return;

    setLoading(true);
    setError(null);

    try {
      const response = await searchAPI.search({
        q: query,
        cursor,
        limit: 15,
        ...filters,
      });

      setResults(prev => [...prev, ...response.data.posts]);
      setCursor(response.data.nextCursor);
      setHasMore(response.data.hasMore);
      
      // Track search query only on first load
      if (!cursor) {
        searchAPI.trackSearch(query).catch(() => {});
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.message || 'Failed to load results');
      if (!cursor) {
        toast.error('Failed to search');
      }
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [query, cursor, filters]);

  // Serialize filters for comparison
  const filtersString = JSON.stringify(filters);

  // Reset and load initial results when query or filters change
  useEffect(() => {
    let isCancelled = false;
    let parsedFilters = {};

    try {
      parsedFilters = JSON.parse(filtersString);
    } catch {
      parsedFilters = {};
    }

    // Clear previous results
    setResults([]);
    setCursor(null);
    setHasMore(true);
    setError(null);
    setInitialLoad(true);
    
    // Only search if query has at least 2 characters
    if (query && query.trim().length >= 2) {
      // Small delay to prevent too many rapid searches
      const timer = setTimeout(async () => {
        setLoading(true);
        setError(null);

        try {
          const response = await searchAPI.search({
            q: query,
            cursor: null,
            limit: 15,
            ...parsedFilters,
          });

          if (isCancelled) return;

          setResults(response.data.posts || []);
          setCursor(response.data.nextCursor || null);
          setHasMore(Boolean(response.data.hasMore));

          searchAPI.trackSearch(query).catch(() => {});
        } catch (err) {
          if (isCancelled) return;

          console.error('Search error:', err);
          setError(err.response?.data?.message || 'Failed to load results');
          toast.error('Failed to search');
        } finally {
          if (!isCancelled) {
            setLoading(false);
            setInitialLoad(false);
          }
        }
      }, 300);
      
      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    } else {
      setInitialLoad(false);
      setLoading(false);
    }
  }, [query, filtersString]);

  // Retry function
  const retry = useCallback(() => {
    setResults([]);
    setCursor(null);
    setHasMore(true);
    setError(null);
    setInitialLoad(true);
    loadMore();
  }, [loadMore]);

  return {
    results,
    loading,
    hasMore,
    loadMore,
    error,
    retry,
    initialLoad,
  };
};