import { useState } from 'react';
import { FiX } from 'react-icons/fi';

export default function TagInput({ tags, onChange, maxTags = 10 }) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const tag = inputValue.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (!tag) return;
    
    if (tags.length >= maxTags) {
      return;
    }
    
    if (tags.includes(tag)) {
      setInputValue('');
      return;
    }
    
    onChange([...tags, tag]);
    setInputValue('');
  };

  const removeTag = (index) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 min-h-[44px]">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 hover:text-primary-900"
            >
              <FiX className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? 'Add tags (press Enter or comma)' : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent"
          disabled={tags.length >= maxTags}
        />
      </div>
      <p className="text-xs text-gray-500">
        {tags.length}/{maxTags} tags • Press Enter or comma to add • No spaces allowed
      </p>
    </div>
  );
}