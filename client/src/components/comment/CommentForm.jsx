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
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-border bg-bg-primary px-5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-primary/40"
        maxLength={1000}
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-colors"
      >
        {loading ? 'Posting...' : 'Comment'}
      </button>
    </form>
  );
}