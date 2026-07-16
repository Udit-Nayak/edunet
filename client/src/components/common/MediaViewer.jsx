import { useState, useEffect } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiDownload, FiExternalLink } from 'react-icons/fi';
import { getProxiedMediaUrl } from '../../utils/media';

export default function MediaViewer({ attachments, initialIndex = 0, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentMedia = attachments[currentIndex];
  const mediaUrl = getProxiedMediaUrl(currentMedia?.url);

    const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDownload = () => {
    window.open(mediaUrl, '_blank', 'noopener,noreferrer');
  };


  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors z-10"
        aria-label="Close"
      >
        <FiX className="w-6 h-6" />
      </button>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        className="absolute top-4 right-16 p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors z-10"
        aria-label="Download"
      >
        <FiDownload className="w-6 h-6" />
      </button>

      {/* Navigation Arrows (only show if multiple attachments) */}
      {attachments.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors z-10"
            aria-label="Previous"
          >
            <FiChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white hover:bg-white hover:bg-opacity-20 rounded-full transition-colors z-10"
            aria-label="Next"
          >
            <FiChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Media Content */}
      <div className="max-w-7xl max-h-[90vh] w-full px-16">
        {currentMedia.type === 'image' ? (
          <img
            src={mediaUrl}
            alt={currentMedia.name}
            className="max-w-full max-h-[90vh] mx-auto object-contain"
          />
        ) : currentMedia.type === 'pdf' ? (
          <div className="bg-white rounded-lg p-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">{currentMedia.name}</h3>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FiExternalLink className="w-4 h-4" />
                <span>Open PDF</span>
              </a>
            </div>
            <iframe
              src={mediaUrl}
              title={currentMedia.name}
              className="w-full h-[70vh] border-0 rounded"
            />
          </div>
        ) : null}
      </div>

      {/* Counter */}
      {attachments.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black bg-opacity-50 text-white rounded-full text-sm">
          {currentIndex + 1} / {attachments.length}
        </div>
      )}

      {/* Thumbnail Strip (for multiple images) */}
      {attachments.length > 1 && attachments.filter(a => a.type === 'image').length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex space-x-2 max-w-[90vw] overflow-x-auto px-4 py-2 bg-black bg-opacity-50 rounded-lg">
          {attachments.map((attachment, index) => (
            attachment.type === 'image' && (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-white scale-110'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={getProxiedMediaUrl(attachment.url)}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            )
          ))}
        </div>
      )}

      {/* Media Info */}
      <div className="absolute top-20 left-4 text-white text-sm">
        <p className="font-medium">{currentMedia.name}</p>
        {currentMedia.type === 'image' && (
          <p className="text-gray-300 text-xs mt-1">Click outside to close</p>
        )}
      </div>
    </div>
  );
}