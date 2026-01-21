export default function LoadingSpinner({ size = 'md', text }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div
        className={`${sizeClasses[size]} border-gray-200 border-t-primary-600 rounded-full animate-spin`}
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}