import React, { useState } from 'react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  cssFilter?: string;
  loading?: 'lazy' | 'eager';
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  className = '',
  cssFilter,
  loading = 'lazy',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-[#EDE8DF] dark:bg-[#23211E] text-[#5F5B55] dark:text-[#A6A198] p-4 text-center ${className}`}
      >
        <svg className="w-10 h-10 mb-2 text-[#D62828]" viewBox="0 0 48 48" fill="none">
          <rect x="6" y="10" width="36" height="28" rx="6" stroke="currentColor" strokeWidth="3" />
          <path d="M14 28l7-8 6 6 7-9" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <span className="text-xs font-medium line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${className} ${cssFilter || ''}`}
    />
  );
};
