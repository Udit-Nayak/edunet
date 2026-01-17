import { useState, useEffect } from 'react';
import { answerAPI } from '../../services/api';
import AnswerCard from './AnswerCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiFilter } from 'react-icons/fi';

export default function AnswerList({ postId, acceptedAnswerId, isPostAuthor }) {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('accepted'); // accepted, votes, recent

  useEffect(() => {
    fetchAnswers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, sortBy]);

  const fetchAnswers = async () => {
    try {
      setLoading(true);
      const response = await answerAPI.getAnswersByPost(postId, { sortBy });
      setAnswers(response.data.answers);
    } catch (error) {
      console.error('Failed to load answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerUpdate = (answerId, updates) => {
    setAnswers((prev) =>
      prev.map((answer) =>
        answer._id === answerId ? { ...answer, ...updates } : answer
      )
    );
  };

  const handleAnswerDelete = (answerId) => {
    setAnswers((prev) => prev.filter((answer) => answer._id !== answerId));
  };

  if (loading) {
    return <LoadingSpinner size="md" text="Loading answers..." />;
  }

  return (
    <div className="space-y-4">
      {/* Sort */}
      {answers.length > 0 && (
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <FiFilter className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="accepted">Accepted First</option>
              <option value="votes">Most Votes</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>
      )}

      {/* Answers */}
      {answers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No answers yet. Be the first to answer!</p>
        </div>
      ) : (
        answers.map((answer) => (
          <AnswerCard
            key={answer._id}
            answer={answer}
            isAccepted={answer._id === acceptedAnswerId}
            isPostAuthor={isPostAuthor}
            onUpdate={handleAnswerUpdate}
            onDelete={handleAnswerDelete}
          />
        ))
      )}
    </div>
  );
}