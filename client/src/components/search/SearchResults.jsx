import { useRef, useCallback, useEffect } from 'react';
import PostCard from '../post/PostCard';
import LoadingSpinner from '../common/LoadingSpinner';
import { FiSearch, FiAlertCircle } from 'react-icons/fi';
import { Button } from '../ui/Button';

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
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-card border border-border">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-[15px] font-medium text-text-secondary">Searching across Edunet for "{query}"...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-card border border-border text-center">
        <div className="w-16 h-16 bg-accent-red/10 rounded-full flex items-center justify-center mb-4">
          <FiAlertCircle className="w-8 h-8 text-accent-red" />
        </div>
        <h3 className="text-[18px] font-bold text-text-primary mb-2">
          Search Unavailable
        </h3>
        <p className="text-[15px] text-text-secondary mb-6 max-w-sm">{error}</p>
        <Button onClick={retry} variant="primary">
          Try Again
        </Button>
      </div>
    );
  }

  // No results state
  if (!loading && results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-xl shadow-card border border-border text-center">
        <div className="w-16 h-16 bg-bg-secondary border border-border rounded-full flex items-center justify-center mb-4">
          <FiSearch className="w-8 h-8 text-text-tertiary" />
        </div>
        <h3 className="text-[18px] font-bold text-text-primary mb-2">
          No results found
        </h3>
        <p className="text-[15px] text-text-secondary max-w-md">
          We couldn't find any posts matching <strong className="text-text-primary font-bold">"{query}"</strong>.
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
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <p className="text-[15px] font-medium text-text-secondary">
          <span className="font-bold text-text-primary">{results.length}</span> result{results.length !== 1 ? 's' : ''} for{' '}
          <strong className="text-text-primary font-bold">"{query}"</strong>
        </p>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {results.map((post, index) => {
          const isLastPost = index === results.length - 1;
          return (
            <div key={post._id} ref={isLastPost ? lastPostRef : null}>
              <PostCard post={post} />
            </div>
          );
        })}
      </div>

      {/* Loading more indicator */}
      {loading && (
        <div className="py-8 flex justify-center">
          <LoadingSpinner size="md" text="Loading more results..." />
        </div>
      )}

      {/* End of results */}
      {!hasMore && results.length > 0 && (
        <div className="py-8 text-center flex items-center justify-center gap-4">
          <div className="h-px bg-border flex-1 max-w-[100px]" />
          <p className="text-[13px] font-bold text-text-tertiary uppercase tracking-wider">
            End of results
          </p>
          <div className="h-px bg-border flex-1 max-w-[100px]" />
        </div>
      )}
    </div>
  );
}