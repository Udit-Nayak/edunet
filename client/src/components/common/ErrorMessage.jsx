import { FiAlertCircle } from 'react-icons/fi';

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <FiAlertCircle className="w-16 h-16 text-red-500" />
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Oops! Something went wrong
        </h3>
        <p className="text-gray-600">{message || 'An error occurred'}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary px-6 py-2"
        >
          Try Again
        </button>
      )}
    </div>
  );
}