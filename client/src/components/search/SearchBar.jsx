import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiSearch, FiX, FiClock, FiTrendingUp } from "react-icons/fi";
import { useSearchSuggestions } from "../../hooks/useSearchSuggestions";

export default function SearchBar({ initialQuery = "", variant = "navbar" }) {
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions } = useSearchSuggestions(query);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Update query when initialQuery changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Update query when URL changes (for search page)
  useEffect(() => {
    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search);
      const urlQuery = params.get('q') || '';
      if (urlQuery !== query) {
        setQuery(urlQuery);
      }
    }
  }, [location]);

  // Load recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("recentSearches") || "[]");
    } catch {
      return [];
    }
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      return;
    }

    // Save to recent searches
    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    const updated = [trimmed, ...recent.filter(s => s !== trimmed)].slice(0, 5);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
    setRecentSearches(updated);

    // Navigate to search page (will update if already there)
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  const clearRecentSearches = () => {
    localStorage.removeItem("recentSearches");
    setRecentSearches([]);
  };

  const removeRecentSearch = (searchToRemove) => {
    const updated = recentSearches.filter((s) => s !== searchToRemove);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
    setRecentSearches(updated);
  };

  const isLarge = variant === "page";

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <FiSearch
            className={`absolute left-3 text-gray-400 pointer-events-none ${
              isLarge ? "top-4 w-5 h-5" : "top-3 w-4 h-4"
            }`}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search posts, questions, articles..."
            className={`w-full bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all ${
              isLarge ? "pl-11 pr-10 py-3 text-base" : "pl-10 pr-9 py-2 text-sm"
            }`}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className={`absolute right-3 text-gray-400 hover:text-gray-600 ${
                isLarge ? "top-4" : "top-3"
              }`}
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && (query.length >= 2 || recentSearches.length > 0) && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50"
        >
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(suggestion.text);
                    handleSearch(suggestion.text);
                  }}
                  className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-left"
                >
                  <span className="text-xl">{suggestion.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {suggestion.text}
                    </p>
                    {suggestion.count && (
                      <p className="text-xs text-gray-500">
                        {suggestion.count} posts
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-xs font-semibold text-gray-500 uppercase">
                  Recent
                </div>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((recent, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <FiClock className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => {
                      setQuery(recent);
                      handleSearch(recent);
                    }}
                    className="flex-1 text-left text-sm text-gray-700 truncate"
                  >
                    {recent}
                  </button>
                  <button
                    onClick={() => removeRecentSearch(recent)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* No suggestions and no recent */}
          {suggestions.length === 0 &&
            recentSearches.length === 0 &&
            query.length >= 2 && (
              <div className="p-6 text-center text-gray-500 text-sm">
                <FiTrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No suggestions found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}