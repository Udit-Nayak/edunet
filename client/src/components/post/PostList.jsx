import PostCard from './PostCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

export default function PostList({ posts, loading, error, onRetry, onDelete }) {
  if (loading) {
    return <LoadingSpinner size="lg" text="Loading posts..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="text-gray-400 text-6xl mb-4">📭</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts found</h3>
        <p className="text-gray-600">Be the first to share something!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard key={post._id} post={post} onDelete={onDelete} />
      ))}
    </div>
  );
}