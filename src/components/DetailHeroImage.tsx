import React from 'react';

interface DetailHeroImageProps {
  src: string;
  alt: string;
}

/**
 * Keeps the complete saved image visible in detail headers. A blurred copy
 * fills the surrounding wide banner, so portrait and 4:3 images never leave
 * an empty area and are never enlarged with object-cover until content is cut.
 */
export default function DetailHeroImage({ src, alt }: DetailHeroImageProps) {
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-xl saturate-125"
        referrerPolicy="no-referrer"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-slate-950/35"
        aria-hidden="true"
      />
      <img
        src={src}
        alt={alt}
        className="pointer-events-none relative h-full w-full object-contain"
        referrerPolicy="no-referrer"
        decoding="async"
        draggable={false}
      />
    </>
  );
}
