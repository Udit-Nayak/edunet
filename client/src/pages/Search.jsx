import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import SearchBar from '../components/search/SearchBar';
import SearchFilters from '../components/search/SearchFilters';
import SearchResults from '../components/search/SearchResults';
import { useInfiniteSearch } from '../hooks/useInfiniteSearch';

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <SearchBar initialQuery={query} variant="page" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6">
              <SearchFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearAll={handleClearFilters}
              />
            </div>
          </aside>

          {/* Results Area */}
          <main className="lg:col-span-3">
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
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="text-gray-400 text-6xl mb-4">🔍</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Start Searching
                </h2>
                <p className="text-gray-600">
                  Enter a search term to find posts, questions, and articles
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}