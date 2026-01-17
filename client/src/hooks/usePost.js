import { useState, useEffect, useCallback } from 'react';
import { postAPI } from '../services/api';

export const usePost = (postId) => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    
    try {
      setLoading(true);
      const response = await postAPI.getPostById(postId);
      setPost(response.data.post);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return { post, loading, error, refetch: fetchPost };
};