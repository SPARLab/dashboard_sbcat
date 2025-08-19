import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function LoadingSpinner({ 
  message = "Loading...", 
  size = 'medium',
  className = ""
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6', 
    large: 'w-8 h-8'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div 
        className={`${sizeClasses[size]} border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <span className="text-sm text-gray-600">{message}</span>
      )}
    </div>
  );
}
