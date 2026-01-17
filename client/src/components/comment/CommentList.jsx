import { useState, useEffect } from 'react';
import { commentAPI } from '../../services/api';
import CommentCard from './CommentCard';
import CommentForm from './CommentForm';
import LoadingSpinner from '../common/LoadingSpinner';

export default function CommentList({ postId, answerId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, answerId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = postId
        ? await commentAPI.getCommentsByPost(postId)
        : await commentAPI.getCommentsByAnswer(answerId);
      setComments(response.data.comments);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentAdded = () => {
    fetchComments();
  };

  const handleCommentDelete = (commentId) => {
    setComments((prev) => prev.filter((c) => c._id !== commentId));
  };

  if (loading) {
    return <LoadingSpinner size="sm" />;
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentCard
          key={comment._id}
          comment={comment}
          onDelete={handleCommentDelete}
        />
      ))}
      <CommentForm
        postId={postId}
        answerId={answerId}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
}