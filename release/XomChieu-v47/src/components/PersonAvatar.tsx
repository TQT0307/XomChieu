import React, { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';

interface PersonAvatarProps {
  src?: string;
  alt: string;
  className?: string;
  iconClassName?: string;
}

export default function PersonAvatar({ src, alt, className = '', iconClassName = '' }: PersonAvatarProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => setLoadFailed(false), [src]);

  if (!src?.trim() || loadFailed) {
    return (
      <div role="img" aria-label={alt} className={`flex items-center justify-center bg-slate-200 text-slate-500 ${className}`}>
        <UserRound className={iconClassName || 'w-1/2 h-1/2'} strokeWidth={1.8} />
      </div>
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setLoadFailed(true)} />;
}
