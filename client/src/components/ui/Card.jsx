import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';

export function Card({ children, className = '', hoverable = false, ...props }) {
  const baseStyles = 'bg-bg-primary border border-border rounded-md shadow-card p-4 transition-all duration-200 ease-in-out';
  
  if (hoverable) {
    return (
      <motion.div 
        whileHover={{ y: -1 }}
        className={`${baseStyles} hover:shadow-card-hover ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${baseStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}
