import { useState, useEffect } from 'react';
import { FiBookmark } from 'react-icons/fi';
import { FaBookmark } from 'react-icons/fa';
import { postAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function SaveButton({ postId, initialSaved = false, onSaveChange, showCount = false, saveCount = 0 }) {
  const [saved, setSaved] = useState(initialSaved);
  const [count, setCount] = useState(saveCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSaved(initialSaved);
  }, [initialSaved]);

  useEffect(() => {
    setCount(saveCount);
  }, [saveCount]);

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (loading) return;

    setLoading(true);

    try {
      const response = await postAPI.savePost(postId);
      const newSaved = response.data.saved;
      const newCount = response.data.saveCount;

      setSaved(newSaved);
      setCount(newCount);

      if (onSaveChange) {
        onSaveChange(newSaved, newCount);
      }

      toast.success(newSaved ? 'Post saved!' : 'Post unsaved');
    } catch (error) {
      console.error('Save post error:', error);
      toast.error('Failed to save post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSave}
      disabled={loading}
      className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        saved
          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
          : 'text-gray-600 hover:bg-gray-100'
      } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={saved ? 'Unsave post' : 'Save post'}
    >
      {saved ? (
        <FaBookmark className="w-4 h-4" />
      ) : (
        <FiBookmark className="w-4 h-4" />
      )}
      <span>{saved ? 'Saved' : 'Save'}</span>
      {showCount && count > 0 && (
        <span className="text-xs">({count})</span>
      )}
    </button>
  );
}