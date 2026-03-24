import React, { useState } from 'react';
import { FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { formatNumber } from '../../utils/formatters';
import toast from 'react-hot-toast';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

export default function VoteButton({ 
  targetId, 
  initialVotes = 0,
  userVote = null, // 'upvote', 'downvote', or null
  onUpvote,
  onDownvote,
  size = 'md',
  onUpvoteTracking,
  onDownvoteTracking,
  horizontal = false // added horizontal variant support
}) {
  const [votes, setVotes] = useState(initialVotes);
  const [currentVote, setCurrentVote] = useState(userVote);
  const [loading, setLoading] = useState(false);

  const sizeStyles = {
    sm: {
      button: 'w-6 h-6',
      icon: 'w-4 h-4',
      text: 'text-xs',
      containerVertical: 'w-8',
    },
    md: {
      button: 'w-7 h-7',
      icon: 'w-[18px] h-[18px]',
      text: 'text-sm',
      containerVertical: 'w-10',
    },
    lg: {
      button: 'w-8 h-8',
      icon: 'w-5 h-5',
      text: 'text-base',
      containerVertical: 'w-12',
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;

  const handleUpvote = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      await onUpvote(targetId);
      
      if (currentVote === 'upvote') {
        setVotes(votes - 1);
        setCurrentVote(null);
      } else if (currentVote === 'downvote') {
        setVotes(votes + 2);
        setCurrentVote('upvote');
        if (onUpvoteTracking) onUpvoteTracking();
      } else {
        setVotes(votes + 1);
        setCurrentVote('upvote');
        if (onUpvoteTracking) onUpvoteTracking();
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
        setVotes(votes + 1);
        setCurrentVote(null);
      } else if (currentVote === 'upvote') {
        setVotes(votes - 2);
        setCurrentVote('downvote');
        if (onDownvoteTracking) onDownvoteTracking();
      } else {
        setVotes(votes - 1);
        setCurrentVote('downvote');
        if (onDownvoteTracking) onDownvoteTracking();
      }
    } catch{
      toast.error('Failed to vote');
    } finally {
      setLoading(false);
    }
  };

  const containerClass = horizontal 
    ? "flex flex-row items-center gap-1"
    : `flex flex-col items-center gap-1 ${currentSize.containerVertical}`;

  return (
    <div className={containerClass}>
      <motion.button
        whileTap={{ scale: 1.3 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        onClick={handleUpvote}
        disabled={loading}
        className={`${currentSize.button} rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
          currentVote === 'upvote'
            ? 'text-accent-orange'
            : 'text-text-secondary hover:text-accent-orange hover:bg-[rgba(255,69,0,0.08)]'
        }`}
        title="Upvote"
      >
        <FiArrowUp className={currentSize.icon} />
      </motion.button>
      
      <span
        className={`${currentSize.text} font-semibold text-center ${
          currentVote === 'upvote'
            ? 'text-accent-orange'
            : currentVote === 'downvote'
            ? 'text-accent-red'
            : 'text-text-primary'
        }`}
      >
        {formatNumber(votes)}
      </span>
      
      <motion.button
        whileTap={{ scale: 1.3 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        onClick={handleDownvote}
        disabled={loading}
        className={`${currentSize.button} rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
          currentVote === 'downvote'
            ? 'text-accent-red'
            : 'text-text-secondary hover:text-accent-red hover:bg-[rgba(255,69,0,0.08)]'
        }`}
        title="Downvote"
      >
        <FiArrowDown className={currentSize.icon} />
      </motion.button>
    </div>
  );
}