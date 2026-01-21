import { useRef, useCallback, useEffect } from 'react';
import PostCard from '../post/PostCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiSearch, FiAlertCircle } from 'react-icons/fi';

export default function SearchResults({ query, results, loading, hasMore, loadMore, error, retry, initialLoad }) {
  const observerRef = useRef();

  // Intersection Observer for infinite scroll
  const lastPostRef = useCallback(
    (node) => {
      if (loading) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, loadMore]
  );

  // Cleanup observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Initial loading state
  if (initialLoad && loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Searching for "{query}"...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
        <FiAlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Search Error
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={retry} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  // No results state
  if (!loading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border border-gray-200">
        <FiSearch className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No results found
        </h3>
        <p className="text-gray-600 text-center max-w-md">
          We couldn't find any posts matching <strong>"{query}"</strong>.
          <br />
          Try different keywords or remove some filters.
        </p>
      </div>
    );
  }

  // Results
  return (
    <div className="space-y-4">
      {/* Results count */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <p className="text-sm text-gray-600">
          {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
          <strong>"{query}"</strong>
        </p>
      </div>

      {/* Posts */}
      {results.map((post, index) => {
        const isLastPost = index === results.length - 1;
        return (
          <div key={post._id} ref={isLastPost ? lastPostRef : null}>
            <PostCard post={post} />
          </div>
        );
      })}

      {/* Loading more indicator */}
      {loading && (
        <div className="py-8">
          <LoadingSpinner size="md" text="Loading more results..." />
        </div>
      )}

      {/* End of results */}
      {!hasMore && results.length > 0 && (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">
            You've reached the end of the results
          </p>
        </div>
      )}
    </div>
  );
}