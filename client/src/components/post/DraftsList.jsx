import { useState, useEffect } from 'react';
import { postAPI } from '../../services/api';
import { formatTimeAgo, truncateText } from '../../utils/formatters';
import { FiClock, FiTrash2, FiEdit3 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';

export default function DraftsList({ onLoadDraft, onDeleteDraft }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const response = await postAPI.getMyDrafts();
      setDrafts(response.data.drafts);
    } catch (error) {
      console.error('Failed to fetch drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draftId, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      await postAPI.deletePost(draftId);
      setDrafts(drafts.filter(d => d._id !== draftId));
      toast.success('Draft deleted');
      if (onDeleteDraft) onDeleteDraft(draftId);
    } catch {
      toast.error('Failed to delete draft');
    }
  };

  const handleLoadDraft = (draft) => {
    if (onLoadDraft) {
      onLoadDraft(draft);
    }
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <LoadingSpinner size="sm" text="Loading drafts..." />
      </div>
    );
  }

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <FiEdit3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">
            Your Drafts ({drafts.length})
          </h3>
        </div>
        {drafts.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {expanded ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <div
              key={draft._id}
              className="bg-white border border-blue-200 rounded-lg p-3 hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => handleLoadDraft(draft)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      draft.type === 'question' ? 'bg-blue-100 text-blue-700' :
                      draft.type === 'note' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {draft.type}
                    </span>
                    <span className="flex items-center space-x-1 text-xs text-orange-600">
                      <FiClock className="w-3 h-3" />
                      <span>{draft.daysRemaining} day{draft.daysRemaining !== 1 ? 's' : ''} left</span>
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 truncate mb-1">
                    {draft.title || 'Untitled Draft'}
                  </h4>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {truncateText(draft.content.replace(/<[^>]*>/g, ''), 100)}
                  </p>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Last edited {formatTimeAgo(draft.updatedAt)}
                  </p>
                </div>

                <button
                  onClick={(e) => handleDelete(draft._id, e)}
                  className="ml-3 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete draft"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!expanded && (
        <p className="text-sm text-blue-700">
          Click "Show" to view and load your saved drafts
        </p>
      )}
    </div>
  );
}