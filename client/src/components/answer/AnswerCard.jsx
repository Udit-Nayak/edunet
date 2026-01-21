import { useState } from 'react';
import { Link } from 'react-router-dom';
import { answerAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import VoteButton from '../post/VoteButton';
import CommentList from '../comment/CommentList';
import { formatTimeAgo } from '../../utils/formatters';
import { FiCheckCircle, FiEdit, FiTrash2, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';

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
    <div className={`border border-gray-200 rounded-lg p-4 ${isAccepted ? 'bg-green-50 border-green-300' : 'bg-white'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1">
          <img
            src={answer.authorId?.avatar || `https://ui-avatars.com/api/?name=${answer.authorId?.username}&background=random`}
            alt={answer.authorId?.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <Link
              to={`/user/${answer.authorId?._id}`}
              className="font-medium text-gray-900 hover:text-primary-600"
            >
              {answer.authorId?.username}
            </Link>
            <div className="text-sm text-gray-500">
              {formatTimeAgo(answer.createdAt)}
              {answer.isEdited && <span> • (edited)</span>}
            </div>
          </div>
          {isAccepted && (
            <div className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-full text-sm font-medium">
              <FiCheckCircle className="w-4 h-4" />
              <span>Accepted Answer</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isPostAuthor && !isAccepted && (
            <button
              onClick={handleAccept}
              className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm font-medium transition-colors"
            >
              <FiCheckCircle className="w-4 h-4" />
              <span>Accept</span>
            </button>
          )}
          {isAuthor && (
            <>
              <button
                onClick={() => setEditing(!editing)}
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded"
              >
                <FiEdit className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="input-field resize-none"
            rows="6"
          />
          <div className="flex space-x-2">
            <button
              onClick={handleEdit}
              className="btn-primary text-sm"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditContent(answer.content);
              }}
              className="btn-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div 
          className="prose max-w-none mb-4"
          dangerouslySetInnerHTML={{ __html: answer.content }}
        />
      )}

      {/* Actions */}
      <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
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
          className="flex items-center space-x-1 text-sm text-gray-600 hover:text-primary-600"
        >
          <FiMessageSquare className="w-4 h-4" />
          <span>{answer.commentCount || 0} comment{answer.commentCount !== 1 ? 's' : ''}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <CommentList answerId={answer._id} />
        </div>
      )}
    </div>
  );
}