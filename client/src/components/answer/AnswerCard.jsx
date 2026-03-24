import { useState } from 'react';
import { Link } from 'react-router-dom';
import { answerAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import VoteButton from '../post/VoteButton';
import CommentList from '../comment/CommentList';
import { formatTimeAgo } from '../../utils/formatters';
import { FiCheckCircle, FiEdit, FiTrash2, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';

export default function AnswerCard({ answer, isAccepted, isPostAuthor, onUpdate, onDelete }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(answer.content);
  const [showComments, setShowComments] = useState(false);

  const isAuthor = user?._id === answer.authorId?._id;

  const handleEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Content cannot be empty');
      return;
    }

    try {
      const response = await answerAPI.updateAnswer(answer._id, { content: editContent });
      onUpdate(answer._id, response.data.answer);
      setEditing(false);
      toast.success('Answer updated');
    } catch {
      toast.error('Failed to update answer');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this answer?')) return;

    try {
      await answerAPI.deleteAnswer(answer._id);
      onDelete(answer._id);
      toast.success('Answer deleted');
    } catch {
      toast.error('Failed to delete answer');
    }
  };

  const handleAccept = async () => {
    try {
      await answerAPI.acceptAnswer(answer._id);
      onUpdate(answer._id, { isAccepted: true });
      toast.success('Answer accepted!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept answer');
    }
  };

  return (
    <div className={`p-6 rounded-xl border transition-all ${isAccepted ? 'bg-[#27C93F]/5 border-[#27C93F]/30 shadow-sm' : 'bg-white border-border shadow-sm'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Avatar src={answer.authorId?.avatar} name={answer.authorId?.username} size="md" showRing={answer.authorId?.reputation > 500} />
              <div className="flex flex-col">
                <Link
                  to={`/user/${answer.authorId?._id}`}
                  className="font-bold text-[15px] text-text-primary hover:text-primary transition-colors"
                >
                  {answer.authorId?.username}
                </Link>
                <div className="text-xs text-text-tertiary font-medium mt-0.5">
                  {formatTimeAgo(answer.createdAt)}
                  {answer.isEdited && <span> • (edited)</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAccepted && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#27C93F]/10 text-[#27C93F] rounded-md text-xs font-bold uppercase tracking-wider">
                  <FiCheckCircle className="w-4 h-4" />
                  <span>Accepted</span>
                </div>
              )}
              {isPostAuthor && !isAccepted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAccept}
                  className="text-[#27C93F] hover:bg-[#27C93F]/10 h-8 flex items-center gap-1.5 px-3"
                >
                  <FiCheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Accept</span>
                </Button>
              )}
              {isAuthor && (
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(!editing)}
                    className="text-text-secondary hover:text-primary h-8 w-8 p-0 flex items-center justify-center"
                  >
                    <FiEdit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-text-secondary hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 flex items-center justify-center"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {isAccepted && (
            <div className="sm:hidden flex items-center gap-1.5 w-fit px-3 py-1 bg-[#27C93F]/10 text-[#27C93F] rounded-md text-xs font-bold uppercase tracking-wider mb-2">
              <FiCheckCircle className="w-4 h-4" />
              <span>Accepted</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-3 mt-4">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={6}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setEditContent(answer.content);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleEdit}
            >
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className="prose prose-p:text-text-primary prose-p:text-[15px] prose-p:leading-relaxed prose-code:text-[#D32F2F] prose-code:bg-bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-pre:bg-[#1D1D1D] prose-pre:text-white prose-pre:font-mono prose-pre:text-sm prose-pre:rounded-xl max-w-none mb-6 tiptap-content"
          dangerouslySetInnerHTML={{ __html: answer.content }}
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-border mt-4">
        <VoteButton
          targetId={answer._id}
          initialVotes={answer.netVotes || 0}
          userVote={answer.userVote}
          onUpvote={answerAPI.upvoteAnswer}
          onDownvote={answerAPI.downvoteAnswer}
          size="sm"
        />
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-text-secondary font-semibold text-[13px] hover:bg-bg-secondary hover:text-text-primary transition-colors"
        >
          <FiMessageSquare className="w-4 h-4" />
          <span>{answer.commentCount || 0} Comments</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-border">
          <CommentList answerId={answer._id} />
        </div>
      )}
    </div>
  );
}