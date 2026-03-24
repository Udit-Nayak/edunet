import { useState, useEffect } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';
import { searchAPI } from '../../services/api';

export default function SearchFilters({ filters, onFilterChange, onClearAll }) {
  const [popularTags, setPopularTags] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Fetch popular tags
    searchAPI.getPopularTags(20)
      .then(response => setPopularTags(response.data.tags || []))
      .catch(() => {
        // Failed to load tags - will show empty state
      });
  }, []);

  const handleTypeChange = (type) => {
    // Always reset answered filter when changing type
    const newFilters = { 
      ...filters, 
      type,
      // Reset answered to 'all' when changing type
      answered: 'all'
    };
    onFilterChange(newFilters);
  };

  const handleTagToggle = (tag) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const handleAnsweredChange = (value) => {
    onFilterChange({ ...filters, answered: value });
  };

  const handleSortChange = (sort) => {
    onFilterChange({ ...filters, sort });
  };

  const hasActiveFilters = 
    filters.type !== 'all' || 
    (filters.tags && filters.tags.length > 0) || 
    filters.answered !== 'all' ||
    filters.sort !== 'relevance';

  return (
    <>
      {/* Mobile Filter Button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white border border-border shadow-sm rounded-xl hover:bg-bg-secondary transition-colors"
        >
          <div className="flex items-center space-x-2">
            <FiFilter className="w-5 h-5 text-text-secondary" />
            <span className="text-[15px] font-bold text-text-primary">Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider rounded-md ml-2">
                Active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="text-[13px] font-bold text-accent-red hover:text-red-700 uppercase tracking-wide"
            >
              Clear all
            </button>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      <div
        className={`
          lg:block bg-transparent lg:bg-transparent rounded-xl lg:border-none p-0 lg:p-0 space-y-6
          ${isOpen ? 'block bg-white border border-border shadow-card p-6 mt-2' : 'hidden'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between hidden lg:flex pb-4 border-b border-border mb-6">
          <div className="flex items-center space-x-2 w-full">
            <FiFilter className="w-5 h-5 text-text-secondary" />
            <h3 className="font-bold text-[16px] text-text-primary">Filters</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-[11px] font-bold uppercase tracking-wider text-accent-red hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-3">
            Sort By
          </label>
          <div className="space-y-2.5">
            {[
              { value: 'relevance', label: 'Most Relevant' },
              { value: 'recent', label: 'Most Recent' },
              { value: 'popular', label: 'Most Popular' },
              { value: 'trending', label: 'Trending' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${filters.sort === option.value ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                  {filters.sort === option.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <input
                  type="radio"
                  name="sort"
                  value={option.value}
                  checked={filters.sort === option.value}
                  onChange={() => handleSortChange(option.value)}
                  className="hidden"
                />
                <span className={`text-[15px] font-medium transition-colors ${filters.sort === option.value ? 'text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary'}`}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="h-px bg-border w-full my-6"></div>

        {/* Post Type */}
        <div>
          <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-3">
            Post Type
          </label>
          <div className="space-y-2.5">
            {[
              { value: 'all', label: 'All Posts', icon: '📄' },
              { value: 'question', label: 'Questions', icon: '❓' },
              { value: 'note', label: 'Notes', icon: '📝' },
              { value: 'article', label: 'Articles', icon: '📰' },
            ].map((type) => (
              <label
                key={type.value}
                className="flex items-center space-x-3 cursor-pointer group"
              >
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${filters.type === type.value ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                  {filters.type === type.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={filters.type === type.value}
                  onChange={() => handleTypeChange(type.value)}
                  className="hidden"
                />
                <span className={`text-[15px] font-medium transition-colors flex items-center gap-2 ${filters.type === type.value ? 'text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary'}`}>
                  <span className="text-base">{type.icon}</span> {type.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Answered Status (only show for questions or all) */}
        {(filters.type === 'all' || filters.type === 'question') && (
          <>
            <div className="h-px bg-border w-full my-6"></div>
            <div>
              <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-3">
                Question Status
              </label>
              <div className="space-y-2.5">
                {[
                  { value: 'all', label: 'All Questions' },
                  { value: 'true', label: 'Answered' },
                  { value: 'false', label: 'Unanswered' },
                ].map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center space-x-3 cursor-pointer group"
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${filters.answered === status.value ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/50'}`}>
                      {filters.answered === status.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <input
                      type="radio"
                      name="answered"
                      value={status.value}
                      checked={filters.answered === status.value}
                      onChange={() => handleAnsweredChange(status.value)}
                      className="hidden"
                    />
                    <span className={`text-[15px] font-medium transition-colors ${filters.answered === status.value ? 'text-primary font-bold' : 'text-text-secondary group-hover:text-text-primary'}`}>
                      {status.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="h-px bg-border w-full my-6"></div>

        {/* Popular Tags */}
        <div>
          <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-3">
            Popular Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {popularTags.slice(0, 15).map((tag) => {
              const isSelected = filters.tags?.includes(tag.name);
              return (
                <button
                  key={tag.name}
                  onClick={() => handleTagToggle(tag.name)}
                  className={`
                    px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all border
                    ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-white text-text-secondary border-border hover:border-text-tertiary hover:text-text-primary'
                    }
                  `}
                >
                  <span className="opacity-70 mr-0.5">#</span>{tag.name}
                  {isSelected && (
                    <FiX className="inline-block w-3.5 h-3.5 ml-1.5 -mr-0.5 opacity-80 hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Tags */}
        {filters.tags && filters.tags.length > 0 && (
          <div className="pt-4 mt-6 border-t border-border">
            <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-3">
              Selected Tags ({filters.tags.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-[13px] font-bold bg-primary/10 text-primary border border-primary/20"
                >
                  <span className="opacity-70 mr-0.5">#</span>{tag}
                  <button
                    onClick={() => handleTagToggle(tag)}
                    className="ml-1.5 p-0.5 rounded-md hover:bg-primary/20 transition-colors"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}