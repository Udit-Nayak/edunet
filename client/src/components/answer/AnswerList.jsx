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
    } catch {
      // Failed to load answers - show empty state
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
        <div className="flex items-center justify-between pb-6 mb-6 border-b border-border">
          <div className="flex items-center gap-2">
            <FiFilter className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm font-semibold text-text-secondary">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-sm font-medium text-text-primary outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none pr-8 relative"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239C92AC%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto' }}
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