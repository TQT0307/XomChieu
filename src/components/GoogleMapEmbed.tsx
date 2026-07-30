import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';

interface GoogleMapEmbedProps {
  src: string;
  title: string;
  className?: string;
}

export default function GoogleMapEmbed({ src, title, className = '' }: GoogleMapEmbedProps) {
  const hasExactCenter = useMemo(() => {
    try { return Boolean(new URL(src).searchParams.get('ll')); } catch { return false; }
  }, [src]);

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <iframe title={title} src={src} className="absolute inset-0 h-full w-full" style={{ border: 0 }} allowFullScreen={false} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      {hasExactCenter && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full" aria-hidden="true">
          <span className="absolute bottom-0 left-1/2 h-5 w-5 -translate-x-1/2 translate-y-1/2 animate-ping rounded-full bg-red-500/30" />
          <MapPin className="relative h-11 w-11 fill-red-600 text-white drop-shadow-[0_3px_4px_rgba(0,0,0,0.55)]" strokeWidth={1.8} />
        </div>
      )}
    </div>
  );
}