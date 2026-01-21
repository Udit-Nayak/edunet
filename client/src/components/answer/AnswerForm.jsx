import { useState } from 'react';
import { answerAPI } from '../../services/api';
import RichTextEditor from '../post/RichTextEditor';
import toast from 'react-hot-toast';

export default function AnswerForm({ postId, onAnswerCreated }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!content.trim() || content === '<p><br></p>') {
      toast.error('Please write your answer');
      return;
    }

    setLoading(true);

    try {
      await answerAPI.createAnswer({ postId, content });
      toast.success('Answer posted!');
      setContent('');
      if (onAnswerCreated) onAnswerCreated();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to post answer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Write your answer here..."
      />
      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
      >
        {loading ? 'Posting...' : 'Post Answer'}
      </button>
    </form>
  );
}