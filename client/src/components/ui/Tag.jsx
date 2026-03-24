import React from 'react';

export function Tag({ children, className = '', isAiSuggestion = false, onClick, ...props }) {
  if (isAiSuggestion) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 border-[1.5px] border-dashed border-accent-teal bg-[#E8FBF8] text-accent-teal rounded-full px-3 py-1 font-medium text-xs hover:bg-accent-teal hover:text-white transition-colors duration-150 cursor-pointer ${className}`}
        {...props}
      >
        <span className="text-[14px]">✨</span>
        {children}
      </button>
    );
  }

  const TagElement = onClick ? 'button' : 'span';

  return (
    <TagElement
      onClick={onClick}
      className={`inline-flex items-center bg-primary-light text-primary rounded-[4px] px-2 py-0.5 text-xs font-medium transition-colors duration-150 ${onClick ? 'hover:bg-primary hover:text-white cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </TagElement>
  );
}

export function SubjectBadge({ subjectColor, children, className = '', ...props }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-0.5 text-xs font-medium border-l-[3px] ${className}`}
      style={{
        backgroundColor: `${subjectColor}1A`, // 10% opacity
        color: subjectColor,
        borderLeftColor: subjectColor
      }}
      {...props}
    >
      {children}
    </span>
  );
}
