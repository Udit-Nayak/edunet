import React from 'react';

export function Avatar({ src, alt = "Avatar", size = 'md', showRing = false, className = '', ...props }) {
  const sizes = {
    sm: 'w-8 h-8',  // 32px
    md: 'w-10 h-10', // 40px
    lg: 'w-20 h-20', // 80px
    xl: 'w-24 h-24', // 96px
    xxl: 'w-32 h-32', // 128px
  };

  const sizeClass = sizes[size] || sizes.md;
  const imageElement = (
    <img
      src={src || "https://ui-avatars.com/api/?name=User&background=F3F2EF&color=1D1D1D"}
      alt={alt}
      className={`${sizeClass} rounded-full object-cover`}
      {...props}
    />
  );

  if (showRing) {
    return (
      <div 
        className={`inline-flex rounded-full p-[2px] ${className}`}
        style={{ background: 'linear-gradient(45deg, #E1306C, #FD5949, #F77737, #FCAF45)' }}
      >
        <div className="rounded-full border-2 border-white overflow-hidden bg-white flex items-center justify-center">
          {imageElement}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex ${className}`}>
      {imageElement}
    </div>
  );
}
