import { useState } from 'react';
import { commentAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function CommentForm({
  postId,
  answerId,
  parentCommentId,
  onCommentAdded,
  placeholder = 'Write a comment...',
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setLoading(true);

    try {
      await commentAPI.createComment({
        postId,
        answerId,
        parentCommentId,
        content,
      });
      setContent('');
      if (onCommentAdded) onCommentAdded();
      toast.success('Comment posted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post comment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex space-x-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="input-field text-sm"
        maxLength={1000}
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="btn-primary text-sm whitespace-nowrap"
      >
        {loading ? 'Posting...' : 'Comment'}
      </button>
    </form>
  );
}