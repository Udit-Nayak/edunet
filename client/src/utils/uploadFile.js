import { uploadAPI } from '../services/api';

/**
 * Upload file to Supabase Storage via backend
 * @param {File} file - File to upload
 * @param {string} bucket - Bucket name
 * @param {function} onProgress - Progress callback
 * @returns {Promise} - { url, name, type, size }
 */
export const uploadFile = async (file, bucket, onProgress) => {
  try {
    // Validate file
    const maxSize = file.type.startsWith('image/') ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    }

    // Allowed types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only images and PDFs are allowed.');
    }

    // Step 1: Get signed upload URL from backend
    const urlResponse = await uploadAPI.getSignedUrl(bucket, file.name);
    const { uploadUrl, publicUrl } = urlResponse.data.data; // Remove unused token

    // Step 2: Upload file directly to Supabase
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'x-upsert': 'false',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }

    // Simulate progress if callback provided
    if (onProgress) {
      onProgress(100);
    }

    // Return file info
    return {
      url: publicUrl,
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'pdf',
      size: file.size,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Upload multiple files
 * @param {FileList} files - Files to upload
 * @param {string} bucket - Bucket name
 * @param {function} onProgress - Overall progress callback
 * @returns {Promise} - Array of uploaded files
 */
export const uploadMultipleFiles = async (files, bucket, onProgress) => {
  const fileArray = Array.from(files);
  const results = [];
  let completed = 0;

  for (const file of fileArray) {
    const result = await uploadFile(file, bucket, (fileProgress) => {
      if (onProgress) {
        const overallProgress =
          ((completed + fileProgress / 100) / fileArray.length) * 100;
        onProgress(overallProgress);
      }
    });
    results.push(result);
    completed++;
    if (onProgress) {
      onProgress((completed / fileArray.length) * 100);
    }
  }

  return results;
};

/**
 * Delete file from storage
 * @param {string} bucket - Bucket name
 * @param {string} filePath - File path
 * @returns {Promise}
 */
export const deleteFile = async (bucket, filePath) => {
  try {
    await uploadAPI.deleteFile(bucket, filePath);
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
};