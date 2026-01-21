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
      .catch(err => console.error('Failed to load tags:', err));
  }, []);

  const handleTypeChange = (type) => {
    onFilterChange({ ...filters, type });
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
          className="w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <div className="flex items-center space-x-2">
            <FiFilter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
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
              className="text-xs text-red-600 hover:text-red-700"
            >
              Clear all
            </button>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      <div
        className={`
          lg:block bg-white rounded-lg border border-gray-200 p-4 space-y-6
          ${isOpen ? 'block' : 'hidden'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FiFilter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filters</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <div className="space-y-2">
            {[
              { value: 'relevance', label: 'Most Relevant' },
              { value: 'recent', label: 'Most Recent' },
              { value: 'popular', label: 'Most Popular' },
              { value: 'trending', label: 'Trending' },
            ].map((option) => (
              <label
                key={option.value}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="sort"
                  value={option.value}
                  checked={filters.sort === option.value}
                  onChange={() => handleSortChange(option.value)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Post Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Type
          </label>
          <div className="space-y-2">
            {[
              { value: 'all', label: 'All Posts', icon: '📄' },
              { value: 'question', label: 'Questions', icon: '❓' },
              { value: 'note', label: 'Notes', icon: '📝' },
              { value: 'article', label: 'Articles', icon: '📰' },
            ].map((type) => (
              <label
                key={type.value}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={filters.type === type.value}
                  onChange={() => handleTypeChange(type.value)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  {type.icon} {type.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Answered Status (for questions) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Status
          </label>
          <div className="space-y-2">
            {[
              { value: 'all', label: 'All Questions' },
              { value: 'true', label: 'Answered' },
              { value: 'false', label: 'Unanswered' },
            ].map((status) => (
              <label
                key={status.value}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="answered"
                  value={status.value}
                  checked={filters.answered === status.value}
                  onChange={() => handleAnsweredChange(status.value)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{status.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Popular Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    px-3 py-1 rounded-full text-xs font-medium transition-colors
                    ${
                      isSelected
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  #{tag.name}
                  {isSelected && (
                    <FiX className="inline-block w-3 h-3 ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Tags */}
        {filters.tags && filters.tags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Tags ({filters.tags.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700"
                >
                  #{tag}
                  <button
                    onClick={() => handleTagToggle(tag)}
                    className="ml-1 hover:text-primary-900"
                  >
                    <FiX className="w-3 h-3" />
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