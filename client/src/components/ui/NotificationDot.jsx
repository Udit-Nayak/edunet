import React from 'react';

export function NotificationDot({ isPulsing = false, className = '' }) {
  return (
    <span 
      className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ${isPulsing ? 'animate-pulse' : ''} ${className}`} 
      style={isPulsing ? { animation: 'pulse 1.5s infinite', transformOrigin: 'center' } : {}}
    >
      {isPulsing && (
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.4); }
            100% { transform: scale(1); }
          }
        `}} />
      )}
    </span>
  );
}
