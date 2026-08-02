import React from 'react';
import { MapPin } from 'lucide-react';

interface GoogleMapEmbedProps {
  src: string;
  title: string;
  className?: string;
}

export default function GoogleMapEmbed({ src, title, className = '' }: GoogleMapEmbedProps) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <iframe
        title={title}
        src={src}
        className="absolute inset-0 h-full w-full"
        style={{ border: 0 }}
        allowFullScreen={false}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {/* Google search embeds may shift their native marker for a place-information panel. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full"
        aria-hidden="true"
        data-map-center-pin="true"
      >
        <span className="absolute bottom-0 left-1/2 h-6 w-6 -translate-x-1/2 translate-y-1/2 animate-ping rounded-full bg-red-500/30" />
        <span className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
        <MapPin className="relative h-12 w-12 fill-red-600 text-white drop-shadow-[0_4px_5px_rgba(0,0,0,0.55)]" strokeWidth={1.8} />
      </div>
    </div>
  );
}