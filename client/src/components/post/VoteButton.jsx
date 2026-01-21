import { useState } from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { formatNumber } from '../../utils/formatters';
import toast from 'react-hot-toast';

export default function VoteButton({ 
  targetId, 
  initialVotes = 0,
  userVote = null, // 'upvote', 'downvote', or null
  onUpvote,
  onDownvote,
  size = 'md'
}) {
  const [votes, setVotes] = useState(initialVotes);
  const [currentVote, setCurrentVote] = useState(userVote);
  const [loading, setLoading] = useState(false);

  const handleUpvote = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await onUpvote(targetId);
      
      if (currentVote === 'upvote') {
        // Remove upvote
        setVotes(votes - 1);
        setCurrentVote(null);
      } else if (currentVote === 'downvote') {
        // Change from downvote to upvote
        setVotes(votes + 2);
        setCurrentVote('upvote');
      } else {
        // Add upvote
        setVotes(votes + 1);
        setCurrentVote('upvote');
      }
    } catch {
      toast.error('Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  const handleDownvote = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await onDownvote(targetId);
      
      if (currentVote === 'downvote') {
        // Remove downvote
        setVotes(votes + 1);
        setCurrentVote(null);
      } else if (currentVote === 'upvote') {
        // Change from upvote to downvote
        setVotes(votes - 2);
        setCurrentVote('downvote');
      } else {
        // Add downvote
        setVotes(votes - 1);
        setCurrentVote('downvote');
      }
    } catch{
      toast.error('Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={`flex items-center space-x-2 ${sizeClasses[size]}`}>
      <button
        onClick={handleUpvote}
        disabled={loading}
        className={`p-1 rounded transition-colors disabled:opacity-50 ${
          currentVote === 'upvote'
            ? 'text-primary-600 bg-primary-50'
            : 'text-gray-500 hover:text-primary-600 hover:bg-gray-100'
        }`}
        title="Upvote"
      >
        <FiArrowUp className={iconSizeClasses[size]} />
      </button>
      
      <span
        className={`font-semibold min-w-[2rem] text-center ${
          votes > 0
            ? 'text-primary-600'
            : votes < 0
            ? 'text-red-600'
            : 'text-gray-700'
        }`}
      >
        {formatNumber(votes)}
      </span>
      
      <button
        onClick={handleDownvote}
        disabled={loading}
        className={`p-1 rounded transition-colors disabled:opacity-50 ${
          currentVote === 'downvote'
            ? 'text-red-600 bg-red-50'
            : 'text-gray-500 hover:text-red-600 hover:bg-gray-100'
        }`}
        title="Downvote"
      >
        <FiArrowDown className={iconSizeClasses[size]} />
      </button>
    </div>
  );
}