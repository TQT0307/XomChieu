import React from 'react';

interface DetailHeroImageProps {
  src: string;
  alt: string;
  onClick?: () => void;
  clickTitle?: string;
  foregroundAspectRatio?: 'natural' | '16:9';
}

/**
 * Keeps the complete saved image visible with one decoded image only.
 * Avoiding a duplicate blurred copy reduces network, decode and GPU work.
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
      loading="eager"
      decoding="async"
      fetchPriority="high"
      draggable={false}
    />
  );

  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-slate-950" aria-hidden="true" />
      {foregroundAspectRatio === '16:9' ? (
        <div className="relative h-full w-full overflow-hidden">
          {foregroundImage}
        </div>
      ) : (
        <div className="relative h-full w-full">
          {foregroundImage}
        </div>
      )}
    </>
  );
}
