import React from 'react';

export function TypeBadge({ type, className = '', ...props }) {
  const types = {
    NOTE: 'bg-[#E8FBF8] text-accent-teal',
    QUESTION: 'bg-[#FFF0EB] text-accent-orange',
    EXPLANATION: 'bg-primary-light text-primary',
  };

  const styleClass = types[type.toUpperCase()] || types.NOTE;

  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${styleClass} ${className}`}
      {...props}
    >
      {type}
    </span>
  );
}

export function RepBadge({ score, isTopContributor = false, className = '', ...props }) {
  const baseClass = isTopContributor 
    ? 'bg-accent-orange text-white' 
    : 'bg-[#FFF0EB] text-accent-orange';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${baseClass} ${className}`}
      {...props}
    >
      <span className="text-[11px]">⭐</span>
      {score}
    </span>
  );
}
