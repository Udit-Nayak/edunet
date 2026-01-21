import { useState } from 'react';
import { Link } from 'react-router-dom';
import { commentAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatTimeAgo } from '../../utils/formatters';
import { FiEdit, FiTrash2, FiArrowUp, FiCornerDownRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CommentForm from './CommentForm';

export default function CommentCard({ comment, onDelete, depth = 0 }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReply, setShowReply] = useState(false);
  const [upvotes, setUpvotes] = useState(comment.upvotes || 0);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  const isAuthor = user?._id === comment.authorId?._id;
  const canReply = depth < 2; // Max 3 levels

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      await commentAPI.updateComment(comment._id, { content: editContent });
      toast.success('Comment updated');
      setEditing(false);
    } catch {
      toast.error('Failed to update comment');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await commentAPI.deleteComment(comment._id);
      onDelete(comment._id);
      toast.success('Comment deleted');
    } catch{
      toast.error('Failed to delete comment');
    }
  };

  const handleUpvote = async () => {
    try {
      await commentAPI.upvoteComment(comment._id);
      if (hasUpvoted) {
        setUpvotes(upvotes - 1);
        setHasUpvoted(false);
      } else {
        setUpvotes(upvotes + 1);
        setHasUpvoted(true);
      }
    } catch  {
      toast.error('Failed to vote');
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8' : ''}`}>
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <img
              src={comment.authorId?.avatar || `https://ui-avatars.com/api/?name=${comment.authorId?.username}&background=random`}
              alt={comment.authorId?.username}
              className="w-6 h-6 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 text-sm">
                <Link
                  to={`/user/${comment.authorId?._id}`}
                  className="font-medium text-gray-900 hover:text-primary-600"
                >
                  {comment.authorId?.username}
                </Link>
                <span className="text-gray-500">
                  {formatTimeAgo(comment.createdAt)}
                </span>
                {isAuthor && (
                  <>
                    <button
                      onClick={() => setEditing(!editing)}
                      className="text-gray-500 hover:text-primary-600"
                    >
                      <FiEdit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleDelete}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              {editing ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="input-field text-sm resize-none"
                    rows="2"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEdit}
                      className="text-xs btn-primary"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditContent(comment.content);
                      }}
                      className="text-xs btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleUpvote}
              className={`flex items-center space-x-1 text-xs px-2 py-1 rounded transition-colors ${
                hasUpvoted 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <FiArrowUp className="w-3 h-3" />
              <span>{upvotes}</span>
            </button>
            {canReply && (
              <button
                onClick={() => setShowReply(!showReply)}
                className="flex items-center space-x-1 text-xs text-gray-500 hover:text-primary-600"
              >
                <FiCornerDownRight className="w-3 h-3" />
                <span>Reply</span>
              </button>
            )}
          </div>

          {/* Reply Form */}
          {showReply && (
            <div className="mt-3">
              <CommentForm
                postId={comment.postId}
                answerId={comment.answerId}
                parentCommentId={comment._id}
                onCommentAdded={() => setShowReply(false)}
                placeholder="Write a reply..."
              />
            </div>
          )}

          {/* Nested Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 space-y-3">
              {comment.replies.map((reply) => (
                <CommentCard
                  key={reply._id}
                  comment={reply}
                  onDelete={onDelete}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}