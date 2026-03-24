import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from '../components/common/PageShell';
import SearchFilters from '../components/search/SearchFilters';
import SearchResults from '../components/search/SearchResults';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';
import { FiSearch } from 'react-icons/fi';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [filters, setFilters] = useState({
    type: searchParams.get('type') || 'all',
    tags: searchParams.get('tags')?.split(',').filter(Boolean) || [],
    answered: searchParams.get('answered') || 'all',
    sort: searchParams.get('sort') || 'relevance',
  });

  const { results, loading, hasMore, loadMore, error, retry, initialLoad } = useInfiniteSearch(
    query,
    filters
  );

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (query) params.set('q', query);
    if (filters.type !== 'all') params.set('type', filters.type);
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    if (filters.answered !== 'all') params.set('answered', filters.answered);
    if (filters.sort !== 'relevance') params.set('sort', filters.sort);

    setSearchParams(params, { replace: true });
  }, [filters, query, setSearchParams]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      type: 'all',
      tags: [],
      answered: 'all',
      sort: 'relevance',
    });
  };

  return (
    <PageShell showRightSidebar={false}>
      <div className="w-full max-w-5xl mx-auto py-2">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1 border-r border-border pr-6 hidden lg:block">
            <div className="sticky top-20">
              <SearchFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearFilters}
              />
            </div>
          </aside>

          {/* Results Area */}
          <main className="lg:col-span-3">
            {/* Mobile Filters (visible only on small screens, SearchFilters handles internal toggle) */}
            <div className="block lg:hidden mb-6">
              <SearchFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearFilters}
              />
            </div>

            {query ? (
              <SearchResults
                query={query}
                results={results}
                loading={loading}
                hasMore={hasMore}
                loadMore={loadMore}
                error={error}
                retry={retry}
                initialLoad={initialLoad}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-card border border-border p-12 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mb-6 border border-border">
                  <FiSearch className="w-10 h-10 text-text-tertiary" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">
                  Start Searching
                </h2>
                <p className="text-text-secondary max-w-sm">
                  Use the search bar above to find posts, questions, discussions, and articles across the Edunet network.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </PageShell>
  );
}