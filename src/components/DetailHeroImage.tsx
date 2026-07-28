import React from 'react';

interface DetailHeroImageProps {
  src: string;
  alt: string;
  onClick?: () => void;
  clickTitle?: string;
  foregroundAspectRatio?: 'natural' | '16:9';
}

/**
 * Keeps the complete saved image visible in detail headers. A blurred copy
 * fills the surrounding wide banner, so portrait and 4:3 images never leave
 * an empty area and are never enlarged with object-cover until content is cut.
 */
export default function DetailHeroImage({
  src,
  alt,
  onClick,
  clickTitle,
  foregroundAspectRatio = 'natural'
}: DetailHeroImageProps) {
  const foregroundImage = (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      title={clickTitle}
      className={`h-full w-full ${
        foregroundAspectRatio === '16:9' ? 'object-cover' : 'object-contain'
      } ${
        onClick ? 'cursor-zoom-in transition-transform duration-300 hover:scale-[1.015]' : 'pointer-events-none'
      }`}
      referrerPolicy="no-referrer"
      decoding="async"
      draggable={false}
    />
  );

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
      {foregroundAspectRatio === '16:9' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative aspect-video h-full max-h-full max-w-full overflow-hidden">
            {foregroundImage}
          </div>
        </div>
      ) : (
        <div className="relative h-full w-full">
          {foregroundImage}
        </div>
      )}
    </>
  );
}
