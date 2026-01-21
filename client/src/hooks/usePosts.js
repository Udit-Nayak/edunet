import { useState, useEffect, useCallback } from 'react';
import { postAPI } from '../services/api';

export const usePosts = (filters = {}) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const fetchPosts = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const response = await postAPI.getPosts({
        ...filters,
        page: pageNum,
        limit: 10,
      });
      
      const newPosts = response.data.posts;
      
      if (append) {
        setPosts(prev => [...prev, ...newPosts]);
      } else {
        setPosts(newPosts);
      }
      
      setHasMore(response.data.pagination.currentPage < response.data.pagination.totalPages);
      setPage(pageNum);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPosts(1, false);
  }, [fetchPosts]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(page + 1, true);
    }
  };

  return { posts, loading, error, hasMore, loadMore, refetch: () => fetchPosts(1, false) };
};