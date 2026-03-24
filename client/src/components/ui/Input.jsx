import React, { forwardRef } from 'react';

export const Input = forwardRef(({ className = '', error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={`
        w-full border-[1.5px] rounded-md px-3.5 py-2.5 text-sm transition-all duration-200 outline-none
        ${error 
          ? 'border-accent-red shadow-[0_0_0_2px_rgba(255,88,91,0.20)]' 
          : 'border-border focus:border-primary focus:shadow-input-focus'}
        ${className}
      `}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export const Textarea = forwardRef(({ className = '', error, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={`
        w-full border-[1.5px] rounded-md px-3.5 py-2.5 text-sm transition-all duration-200 outline-none
        ${error 
          ? 'border-accent-red shadow-[0_0_0_2px_rgba(255,88,91,0.20)]' 
          : 'border-border focus:border-primary focus:shadow-input-focus'}
        ${className}
      `}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';
