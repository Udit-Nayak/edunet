import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { postAPI } from '../services/api';
import PageShell from '../components/common/PageShell';
import RichTextEditor from '../components/post/RichTextEditor';
import TagInput from '../components/post/TagInput';
import FileUpload from '../components/common/FileUpload';
import DraftsList from '../components/post/DraftsList';
import toast from 'react-hot-toast';
import { FiX, FiFile, FiAlertCircle, FiZap, FiEdit3 } from 'react-icons/fi';
import axios from 'axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function CreatePost() {
  const [formData, setFormData] = useState({
    type: 'question',
    title: '',
    content: '',
    tags: [],
    attachments: [],
    status: 'published',
  });
  const [loading, setLoading] = useState(false);
  const [loadedDraftId, setLoadedDraftId] = useState(null);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const fetchTagSuggestions = useCallback(async () => {
    const text = `${formData.title} ${formData.content.replace(/<[^>]*>/g, '')}`.trim();
    if (text.length < 20) {
      setTagSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const response = await axios.post('/api/ml/tags/suggest', { text });
      if (response.data.success && response.data.suggested_tags) {
        const suggestions = response.data.suggested_tags
          .filter(tag => !formData.tags.includes(tag))
          .map(tag => ({ tag, confidence: 1.0 }));
        setTagSuggestions(suggestions);
      }
    } catch {
      try {
        const response = await axios.post('/api/tags/suggest', {
          text, threshold: 0.3, top_k: 5
        });
        if (response.data.success && response.data.suggestions) {
          const suggestions = response.data.suggestions.filter(
            s => !formData.tags.includes(s.tag)
          );
          setTagSuggestions(suggestions);
        }
      } catch (error) {
        if (error.response?.status !== 503) {
          // ML service unavailable - gracefully degrade
        }
        setTagSuggestions([]);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  }, [formData.title, formData.content, formData.tags]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTagSuggestions();
    }, 800);
    return () => clearTimeout(timer);
  }, [fetchTagSuggestions]);

  const addSuggestedTag = (tag) => {
    if (!formData.tags.includes(tag) && formData.tags.length < 10) {
      handleChange('tags', [...formData.tags, tag]);
    }
  };

  const handleFileUpload = (uploadedFiles) => {
    const files = Array.isArray(uploadedFiles) ? uploadedFiles : [uploadedFiles];
    setFormData({
      ...formData,
      attachments: [...formData.attachments, ...files],
    });
  };

  const removeAttachment = (index) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  const handleLoadDraft = (draft) => {
    if (formData.title || formData.content) {
      if (!window.confirm('Loading this draft will replace your current work. Continue?')) return;
    }
    setFormData({
      type: draft.type,
      title: draft.title,
      content: draft.content,
      tags: draft.tags || [],
      attachments: draft.attachments || [],
      status: 'draft',
    });
    setLoadedDraftId(draft._id);
    toast.success(`Draft loaded: ${draft.title || 'Untitled'}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDraft = (draftId) => {
    if (loadedDraftId === draftId) setLoadedDraftId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) { toast.error('Title is required'); return; }
    if (!formData.content.trim() || formData.content === '<p><br></p>') { toast.error('Content is required'); return; }
    if (formData.title.length < 5) { toast.error('Title must be at least 5 characters'); return; }

    setLoading(true);
    try {
      let response;
      if (loadedDraftId) {
        response = await postAPI.updatePost(loadedDraftId, { ...formData, status: 'published' });
      } else {
        response = await postAPI.createPost({ ...formData, status: 'published' });
      }
      toast.success('Post published successfully!');
      navigate(`/post/${response.data.post._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim() && !formData.content.trim()) {
      toast.error('Please add a title or content before saving as draft');
      return;
    }
    setLoading(true);
    try {
      if (loadedDraftId) {
        await postAPI.updatePost(loadedDraftId, { ...formData, status: 'draft' });
        toast.success('Draft updated!');
      } else {
        const response = await postAPI.createPost({ ...formData, status: 'draft' });
        setLoadedDraftId(response.data.post._id);
        toast.success('Draft saved! It will be deleted automatically after 3 days.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = (type) => {
    if (type === 'question') return 'What is your question?';
    if (type === 'note') return 'Title of your note';
    return 'Article title';
  };

  const getContentPlaceholder = (type) => {
    if (type === 'question') return 'Provide more details about your question...';
    return 'Write your content here...';
  };

  return (
    <PageShell showRightSidebar={false}>
      <div className="max-w-4xl w-full mx-auto flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-card border border-border p-6 sm:p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
            <FiEdit3 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">Create Post</h1>
            <p className="text-sm text-text-secondary">Share your knowledge with the Edunet community</p>
          </div>
        </div>

        {/* Drafts List */}
        <DraftsList onLoadDraft={handleLoadDraft} onDeleteDraft={handleDeleteDraft} />

        {/* Draft Notice */}
        {loadedDraftId && (
          <div className="bg-[#FFBD2E]/10 border border-[#FFBD2E]/30 rounded-xl p-4 flex items-start space-x-3">
            <FiAlertCircle className="w-5 h-5 text-[#E6A01A] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-bold text-text-primary">You're editing a draft</p>
              <p className="text-xs text-text-secondary mt-1">
                This draft will be automatically deleted 3 days after creation if not published.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Post Type Selection */}
          <div className="bg-white rounded-xl shadow-card border border-border p-6 sm:p-8">
            <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">
              Post Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { id: 'question', icon: '❓', title: 'Question', desc: 'Ask the community' },
                { id: 'note', icon: '📝', title: 'Note', desc: 'Share your notes' },
                { id: 'article', icon: '📄', title: 'Article', desc: 'Write an article' }
              ].map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleChange('type', type.id)}
                  className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group ${
                    formData.type === type.id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-white hover:border-border-hover hover:bg-bg-secondary'
                  }`}
                >
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">{type.icon}</div>
                  <div className={`font-bold ${formData.type === type.id ? 'text-primary' : 'text-text-primary'}`}>
                    {type.title}
                  </div>
                  <div className="text-xs text-text-tertiary mt-1 text-center font-medium">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="bg-white rounded-xl shadow-card border border-border p-6 sm:p-8 flex flex-col gap-2">
            <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">
              Title <span className="text-accent-red">*</span>
            </label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder={getPlaceholder(formData.type)}
              maxLength={200}
              required
              className="text-lg font-medium p-4 border-Border/50"
            />
            <p className="text-xs font-semibold text-text-tertiary self-end">
              {formData.title.length}/200
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-card border border-border p-6 sm:p-8 flex flex-col gap-3">
            <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">
              Content <span className="text-accent-red">*</span>
            </label>
            <div className="rounded-xl overflow-hidden border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
              <RichTextEditor
                value={formData.content}
                onChange={(value) => handleChange('content', value)}
                placeholder={getContentPlaceholder(formData.type)}
              />
            </div>
          </div>

          {/* Built-in Post Components */}
          
          {/* Tags */}
          <div className="bg-white rounded-xl shadow-card border border-border p-6 sm:p-8 flex flex-col gap-4">
            <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">
              Tags (Max 10)
            </label>
            <div className="w-full">
              <TagInput
                tags={formData.tags}
                onChange={(tags) => handleChange('tags', tags)}
                maxTags={10}
              />
            </div>

            {/* AI Tags */}
            {(tagSuggestions.length > 0 || loadingSuggestions) && (
              <div className="mt-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <FiZap className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    AI Suggested
                  </span>
                  {loadingSuggestions && (
                    <span className="text-xs font-medium text-text-tertiary animate-pulse">Loading...</span>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {tagSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => addSuggestedTag(suggestion.tag)}
                      disabled={formData.tags.includes(suggestion.tag) || formData.tags.length >= 10}
                      className={`
                        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all
                        ${formData.tags.includes(suggestion.tag)
                          ? 'bg-bg-secondary text-text-tertiary cursor-not-allowed opacity-50'
                          : 'bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/20 hover:border-primary'
                        }
                      `}
                    >
                      <FiZap className="w-3.5 h-3.5" />
                      {suggestion.tag}
                      <span className="text-[10px] font-mono opacity-80 bg-green-900/10 px-1 rounded-sm">
                        {Math.round(suggestion.confidence * 100)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-xl shadow-card border border-border p-6 sm:p-8 flex flex-col gap-3">
            <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">
              Attachments <span className="text-text-tertiary font-medium normal-case">(Optional)</span>
            </label>
            <FileUpload
              onUploadComplete={handleFileUpload}
              multiple={true}
              maxFiles={5}
              bucket="post-attachments"
            />

            {formData.attachments.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-1">
                  Attached Files ({formData.attachments.length}/5)
                </h4>
                {formData.attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-bg-secondary rounded-xl border border-border group">
                    <div className="flex items-center gap-3">
                      {file.type === 'image' ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-border">
                          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-[#FF5F56]/10 rounded-lg flex items-center justify-center shrink-0">
                          <FiFile className="w-5 h-5 text-[#FF5F56]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-text-primary truncate">{file.name}</p>
                        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mt-0.5">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="text-text-tertiary hover:text-accent-red hover:bg-accent-red/10 h-8 w-8 p-0 shrink-0"
                    >
                      <FiX className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="bg-white rounded-xl shadow-card border border-border p-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-20">
            <Button
              variant="secondary"
              onClick={() => navigate(-1)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                variant="ghost"
                onClick={handleSaveDraft}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                Save as Draft
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto min-w-[140px]"
              >
                {loading ? 'Publishing...' : 'Publish Post'}
              </Button>
            </div>
          </div>

        </form>
      </div>
    </PageShell>
  );
}