import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { postAPI } from '../services/api';
import Navbar from '../components/common/Navbar';
import RichTextEditor from '../components/post/RichTextEditor';
import TagInput from '../components/post/TagInput';
import FileUpload from '../components/common/FileUpload';
import toast from 'react-hot-toast';
import { FiX, FiFile } from 'react-icons/fi';

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    type: 'question',
    title: '',
    content: '',
    tags: [],
    attachments: [],
    status: 'published',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await postAPI.getPostById(id);
      const post = response.data.post;
      
      setFormData({
        type: post.type,
        title: post.title,
        content: post.content,
        tags: post.tags || [],
        attachments: post.attachments || [],
        status: post.status,
      });
    } catch{
      toast.error('Failed to load post');
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.content.trim() || formData.content === '<p><br></p>') {
      toast.error('Content is required');
      return;
    }

    if (formData.title.length < 5) {
      toast.error('Title must be at least 5 characters');
      return;
    }

    setSubmitting(true);

    try {
      await postAPI.updatePost(id, formData);
      toast.success('Post updated successfully!');
      navigate(`/post/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Post</h1>
          <p className="text-gray-600">Update your post information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Post Type
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => handleChange('type', 'question')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === 'question'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">❓</div>
                <div className="font-semibold">Question</div>
                <div className="text-xs text-gray-500 mt-1">Ask the community</div>
              </button>
              <button
                type="button"
                onClick={() => handleChange('type', 'note')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === 'note'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📝</div>
                <div className="font-semibold">Note</div>
                <div className="text-xs text-gray-500 mt-1">Share your notes</div>
              </button>
              <button
                type="button"
                onClick={() => handleChange('type', 'article')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === 'article'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">📄</div>
                <div className="font-semibold">Article</div>
                <div className="text-xs text-gray-500 mt-1">Write an article</div>
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder={
                formData.type === 'question'
                  ? 'What is your question?'
                  : formData.type === 'note'
                  ? 'Title of your note'
                  : 'Article title'
              }
              className="input-field text-lg"
              maxLength={200}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              {formData.title.length}/200 characters
            </p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => handleChange('content', value)}
              placeholder={
                formData.type === 'question'
                  ? 'Provide more details about your question...'
                  : 'Write your content here...'
              }
            />
          </div>

          {/* File Upload */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            <FileUpload
              onUploadComplete={handleFileUpload}
              multiple={true}
              maxFiles={5}
              bucket="post-attachments"
            />

            {/* Display Uploaded Files */}
            {formData.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">
                  Attached Files ({formData.attachments.length}):
                </h4>
                {formData.attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      {file.type === 'image' ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center">
                          <FiFile className="w-6 h-6 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown size'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <TagInput
              tags={formData.tags}
              onChange={(tags) => handleChange('tags', tags)}
              maxTags={10}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => navigate(`/post/${id}`)}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}