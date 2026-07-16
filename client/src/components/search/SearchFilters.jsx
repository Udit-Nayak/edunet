import { useState, useEffect } from 'react';
import { FiFilter, FiX, FiFileText, FiHelpCircle, FiBookOpen, FiEdit3, FiChevronDown } from 'react-icons/fi';
import { searchAPI } from '../../services/api';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'trending', label: 'Trending' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Posts', icon: <FiFileText className="h-4 w-4" /> },
  { value: 'question', label: 'Questions', icon: <FiHelpCircle className="h-4 w-4" /> },
  { value: 'note', label: 'Notes', icon: <FiEdit3 className="h-4 w-4" /> },
  { value: 'article', label: 'Articles', icon: <FiBookOpen className="h-4 w-4" /> },
];

export default function SearchFilters({ filters, onFilterChange, onClearAll }) {
  const [popularTags, setPopularTags] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    searchAPI.getPopularTags(20)
      .then(response => setPopularTags(response.data.tags || []))
      .catch(() => setPopularTags([]));
  }, []);

  const handleTypeChange = (type) => {
    onFilterChange({ ...filters, type, answered: 'all' });
  };

  const handleTagToggle = (tag) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const hasActiveFilters =
    filters.type !== 'all' ||
    (filters.tags && filters.tags.length > 0) ||
    filters.answered !== 'all' ||
    filters.sort !== 'relevance';

  return (
    <>
      <div className="mb-4 lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-3 shadow-sm transition-colors hover:bg-bg-secondary"
        >
          <div className="flex items-center space-x-2">
            <FiFilter className="h-5 w-5 text-text-secondary" />
            <span className="text-[15px] font-bold text-text-primary">Filters</span>
            {hasActiveFilters && (
              <span className="ml-2 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                Active
              </span>
            )}
          </div>
          <FiChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="mt-2 text-[13px] font-bold uppercase tracking-wide text-accent-red hover:text-red-700"
          >
            Clear all
          </button>
        )}
      </div>

      <div
        className={`
          space-y-6 rounded-lg p-0 lg:block lg:border-none lg:bg-transparent
          ${isOpen ? 'block border border-border bg-white p-6 shadow-card' : 'hidden'}
        `}
      >
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div className="flex w-full items-center space-x-2">
            <FiFilter className="h-5 w-5 text-text-secondary" />
            <h3 className="text-[16px] font-bold text-text-primary">Filters</h3>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-accent-red transition-opacity hover:opacity-80"
            >
              Clear all
            </button>
          )}
        </div>

        <FilterGroup
          label="Sort By"
          name="sort"
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(sort) => onFilterChange({ ...filters, sort })}
        />

        <Divider />

        <FilterGroup
          label="Post Type"
          name="type"
          options={TYPE_OPTIONS}
          value={filters.type}
          onChange={handleTypeChange}
        />

        {(filters.type === 'all' || filters.type === 'question') && (
          <>
            <Divider />
            <FilterGroup
              label="Question Status"
              name="answered"
              options={[
                { value: 'all', label: 'All Questions' },
                { value: 'true', label: 'Answered' },
                { value: 'false', label: 'Unanswered' },
              ]}
              value={filters.answered}
              onChange={(answered) => onFilterChange({ ...filters, answered })}
            />
          </>
        )}

        <Divider />

        <div>
          <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
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
                    rounded-lg border px-3 py-1.5 text-[13px] font-bold transition-all
                    ${
                      isSelected
                        ? 'border-primary bg-primary text-white shadow-sm'
                        : 'border-border bg-white text-text-secondary hover:border-text-tertiary hover:text-text-primary'
                    }
                  `}
                >
                  <span className="mr-0.5 opacity-70">#</span>{tag.name}
                  {isSelected && (
                    <FiX className="ml-1.5 -mr-0.5 inline-block h-3.5 w-3.5 opacity-80 hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {filters.tags && filters.tags.length > 0 && (
          <div className="mt-6 border-t border-border pt-4">
            <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
              Selected Tags ({filters.tags.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-[13px] font-bold text-primary"
                >
                  <span className="mr-0.5 opacity-70">#</span>{tag}
                  <button
                    onClick={() => handleTagToggle(tag)}
                    className="ml-1.5 rounded-md p-0.5 transition-colors hover:bg-primary/20"
                    aria-label={`Remove ${tag} filter`}
                  >
                    <FiX className="h-3.5 w-3.5" />
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

function FilterGroup({ label, name, options, value, onChange }) {
  return (
    <div>
      <label className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        {label}
      </label>
      <div className="space-y-2.5">
        {options.map((option) => (
          <label key={option.value} className="group flex cursor-pointer items-center space-x-3">
            <div className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${value === option.value ? 'border-primary bg-primary' : 'border-border group-hover:border-primary/50'}`}>
              {value === option.value && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
            </div>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="hidden"
            />
            <span className={`flex items-center gap-2 text-[15px] font-medium transition-colors ${value === option.value ? 'font-bold text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
              {option.icon}
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-6 h-px w-full bg-border" />;
}
