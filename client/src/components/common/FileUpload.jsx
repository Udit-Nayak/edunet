import { useState } from 'react';
import { uploadFile, uploadMultipleFiles } from '../../utils/uploadFile';
import { formatFileSize } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { FiUpload, FiX, FiFile } from 'react-icons/fi';

export default function FileUpload({
  onUploadComplete,
  multiple = false,
  accept = 'image/*,application/pdf',
  maxFiles = 5,
  bucket = 'post-attachments',
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);


  const validateFiles = (files) => {
    const fileArray = Array.from(files);
    
    // Check file count
    if (fileArray.length > maxFiles) {
      toast.error(`You can only upload up to ${maxFiles} files`);
      return null;
    }

    // Validate file types
    const acceptedTypes = accept.split(',').map(t => t.trim());
    const invalidFiles = fileArray.filter(file => {
      const fileType = file.type;
      const fileExtension = '.' + file.name.split('.').pop();
      
      return !acceptedTypes.some(acceptedType => {
        if (acceptedType.includes('*')) {
          // Handle wildcards like "image/*"
          const baseType = acceptedType.split('/')[0];
          return fileType.startsWith(baseType);
        }
        // Handle specific types or extensions
        return fileType === acceptedType || fileExtension === acceptedType;
      });
    });

    if (invalidFiles.length > 0) {
      toast.error('Some files have invalid types and were skipped');
      return fileArray.filter(file => !invalidFiles.includes(file));
    }

    return fileArray;
  };

  const handleFiles = (files) => {
    const validFiles = validateFiles(files);
    if (!validFiles || validFiles.length === 0) return;

    setSelectedFiles(validFiles);

    // Generate previews for images
    const newPreviews = [];
    validFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push({ file: file.name, preview: reader.result });
          if (newPreviews.length === validFiles.filter(f => f.type.startsWith('image/')).length) {
            setPreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set dragging to false if we're leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      let results;

      if (multiple && selectedFiles.length > 1) {
        results = await uploadMultipleFiles(selectedFiles, bucket, setProgress);
      } else {
        const result = await uploadFile(selectedFiles[0], bucket, setProgress);
        results = [result];
      }

      toast.success(`${results.length} file(s) uploaded successfully!`);
      onUploadComplete(multiple ? results : results[0]);
      
      // Reset
      setSelectedFiles([]);
      setPreviews([]);
      setProgress(0);
      
      // Clear file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 transition-all ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 bg-white'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center space-y-2">
            <FiUpload className={`w-12 h-12 ${isDragging ? 'text-primary-500' : 'text-gray-400'}`} />
            <div className="text-center">
              <span className={`text-sm font-medium ${isDragging ? 'text-primary-700' : 'text-gray-700'}`}>
                {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                {accept.includes('image') && 'Images'} 
                {accept.includes('pdf') && (accept.includes('image') ? ' and PDFs' : 'PDFs')}
                {' '}up to {maxFiles} files
              </p>
            </div>
          </div>
          <input
            id="file-upload"
            type="file"
            onChange={handleFileChange}
            accept={accept}
            multiple={multiple}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Selected Files ({selectedFiles.length}):
          </p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const preview = previews.find((p) => p.file === file.name);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {preview ? (
                      <img
                        src={preview.preview}
                        alt={file.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                        <FiFile className="w-6 h-6 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                    className="ml-2 p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary-600 h-2 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-gray-600">
            {Math.round(progress)}% uploaded
          </p>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && !uploading && (
        <button
          onClick={handleUpload}
          className="w-full btn-primary py-3"
        >
          Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}