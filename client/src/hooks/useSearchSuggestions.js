import { useState, useEffect } from 'react';
import { searchAPI } from '../services/api';

export const useSearchSuggestions = (query) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await searchAPI.getSuggestions(query);
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error('Suggestions error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce - wait 300ms after user stops typing
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return { suggestions, loading };
};