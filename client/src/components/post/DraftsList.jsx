import { useState, useEffect } from 'react';
import { postAPI } from '../../services/api';
import { formatTimeAgo, truncateText } from '../../utils/formatters';
import { FiClock, FiTrash2, FiEdit3 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import LoadingSpinner from '../common/LoadingSpinner';
import { Button } from '../ui/Button';

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
    } catch {
      // Failed to fetch drafts - show empty state
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
      <div className="bg-bg-secondary border border-border rounded-xl p-6 flex justify-center">
        <LoadingSpinner size="sm" text="Loading drafts..." />
      </div>
    );
  }

  if (drafts.length === 0) {
    return null;
  }

  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white border border-border flex items-center justify-center shadow-sm">
            <FiEdit3 className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold text-text-primary text-[15px]">
            Your Drafts ({drafts.length})
          </h3>
        </div>
        {drafts.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="text-text-secondary hover:text-text-primary"
          >
            {expanded ? 'Hide' : 'Show drafts'}
          </Button>
        )}
      </div>

      {expanded && (
        <div className="space-y-3 mt-4">
          {drafts.map((draft) => (
            <div
              key={draft._id}
              className="bg-white border border-border rounded-xl p-4 hover:border-border-hover hover:shadow-card transition-all cursor-pointer group"
              onClick={() => handleLoadDraft(draft)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-bg-secondary border border-border text-text-secondary">
                      {draft.type}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded-md">
                      <FiClock className="w-3 h-3" />
                      <span>{draft.daysRemaining} day{draft.daysRemaining !== 1 ? 's' : ''} left</span>
                    </span>
                  </div>
                  
                  <h4 className="font-bold text-[15px] text-text-primary truncate mb-1 group-hover:text-primary transition-colors">
                    {draft.title || 'Untitled Draft'}
                  </h4>
                  
                  <p className="text-[13px] text-text-secondary line-clamp-2 leading-relaxed">
                    {truncateText(draft.content.replace(/<[^>]*>/g, ''), 100)}
                  </p>
                  
                  <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mt-3">
                    Last edited {formatTimeAgo(draft.updatedAt)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  onClick={(e) => handleDelete(draft._id, e)}
                  className="text-text-tertiary hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete draft"
                >
                  <FiTrash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!expanded && (
        <p className="text-[13px] text-text-tertiary ml-10.5 font-medium -mt-1">
          You have unpublished work.
        </p>
      )}
    </div>
  );
}