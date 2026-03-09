import { useState, useRef } from 'react';
import { FiCamera, FiUpload, FiX } from 'react-icons/fi';
import { uploadAPI } from '../../services/api';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function AvatarUpload({ currentAvatar, onAvatarChange, size = 'lg' }) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(currentAvatar || null);
  const fileInputRef = useRef(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40'
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      // Create preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Get signed upload URL
      const { data: urlData } = await uploadAPI.getSignedUrl('user-avatars', file.name);
      
      // Upload file to Supabase using signed URL
      await axios.put(urlData.data.uploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
      });

      // Notify parent component with public URL
      onAvatarChange(urlData.data.publicUrl);
      toast.success('Avatar uploaded successfully!');
      
      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
      setPreviewUrl(currentAvatar);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onAvatarChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="relative group">
        {/* Avatar Display */}
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg`}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary-100">
              <FiCamera className="w-8 h-8 text-primary-600" />
            </div>
          )}
        </div>

        {/* Upload Overlay */}
        {!uploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <FiUpload className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Loading Spinner */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {/* Remove Button */}
        {previewUrl && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
      >
        {uploading ? 'Uploading...' : previewUrl ? 'Change Photo' : 'Upload Photo'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        JPG, PNG or GIF • Max 5MB
      </p>
    </div>
  );
}
