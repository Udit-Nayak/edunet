// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import React from 'react';

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  block = false,
  className = '', 
  children, 
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary text-white rounded-pill hover:bg-primary-hover',
    secondary: 'bg-transparent border-[1.5px] border-primary text-primary rounded-pill hover:bg-primary-light',
    destructive: 'bg-accent-red text-white rounded-pill',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-secondary rounded-lg',
    icon: 'w-9 h-9 rounded-pill hover:bg-bg-secondary flex items-center justify-center p-0'
  };

  const sizes = {
    sm: 'px-4 py-1.5 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
    icon: ''
  };

  const variantClass = variants[variant] || variants.primary;
  const sizeClass = variant === 'icon' ? sizes.icon : (sizes[size] || sizes.md);
  const blockClass = block ? 'w-full' : '';

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${baseStyles} ${variantClass} ${sizeClass} ${blockClass} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
