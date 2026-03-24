import { useState } from 'react';
import { Link } from 'react-router-dom';
import { commentAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { formatTimeAgo } from '../../utils/formatters';
import { FiEdit, FiTrash2, FiArrowUp, FiCornerDownRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import CommentForm from './CommentForm';

export default function CommentCard({ comment, onDelete, onRefresh, depth = 0 }) {
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
    <div className={depth > 0 ? 'pl-4 ml-4 border-l-2 border-border/80' : ''}>
      <div className="group bg-bg-secondary rounded-xl p-3">
        <div className="flex items-start gap-3">
          <img
            src={comment.authorId?.avatar || `https://ui-avatars.com/api/?name=${comment.authorId?.username}&background=random`}
            alt={comment.authorId?.username}
            className="w-8 h-8 rounded-full shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Link
                to={`/user/${comment.authorId?._id}`}
                className="font-semibold text-text-primary hover:text-primary"
              >
                {comment.authorId?.username}
              </Link>
              <span className="text-text-tertiary">{formatTimeAgo(comment.createdAt)}</span>

              {isAuthor && (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setEditing(!editing)}
                    className="text-text-tertiary hover:text-primary"
                    aria-label="Edit comment"
                  >
                    <FiEdit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-text-tertiary hover:text-accent-red"
                    aria-label="Delete comment"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm resize-none outline-none focus:ring-2 focus:ring-primary/40"
                  rows="2"
                />
                <div className="flex gap-2">
                  <button onClick={handleEdit} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold">
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-text-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap break-words">{comment.content}</p>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs">
              <button
                onClick={handleUpvote}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full transition-colors ${
                  hasUpvoted
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-tertiary hover:bg-bg-primary hover:text-text-primary'
                }`}
              >
                <FiArrowUp className="w-3.5 h-3.5" />
                <span className="font-semibold">{upvotes}</span>
              </button>

              {canReply && (
                <button
                  onClick={() => setShowReply(!showReply)}
                  className="inline-flex items-center gap-1 text-text-tertiary hover:text-primary font-semibold"
                >
                  <FiCornerDownRight className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              )}
            </div>

            {showReply && (
              <div className="mt-3">
                <CommentForm
                  postId={comment.postId}
                  answerId={comment.answerId}
                  parentCommentId={comment._id}
                  onCommentAdded={() => {
                    setShowReply(false);
                    if (onRefresh) onRefresh();
                  }}
                  placeholder={`Reply to ${comment.authorId?.username || 'comment'}...`}
                />
              </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3 space-y-2">
                {comment.replies.map((reply) => (
                  <CommentCard
                    key={reply._id}
                    comment={reply}
                    onDelete={onDelete}
                    onRefresh={onRefresh}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}