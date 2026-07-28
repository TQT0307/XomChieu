import React from 'react';
import { X } from 'lucide-react';
import useModalScrollLock from '../hooks/useModalScrollLock';

interface PersonPhotoLightboxProps {
  src: string;
  alt: string;
  personType: 'Huấn luyện viên' | 'Thành viên';
  onClose: () => void;
}

export default function PersonPhotoLightbox({
  src,
  alt,
  personType,
  onClose
}: PersonPhotoLightboxProps) {
  useModalScrollLock(true);

  return (
    <div
      className="modal-scroll-lock fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Ảnh chi tiết ${personType.toLowerCase()} ${alt}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/60 p-3 text-white transition-colors hover:bg-rose-600"
        aria-label="Đóng ảnh chi tiết"
      >
        <X className="h-6 w-6" />
      </button>

      <div
        className="relative flex max-h-[88dvh] max-w-5xl items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-slate-950 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[88dvh] max-w-full object-contain"
          referrerPolicy="no-referrer"
          draggable={false}
        />
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-center text-xs font-bold text-white backdrop-blur-sm">
          Ảnh chi tiết {personType.toLowerCase()}: {alt}
        </span>
      </div>
    </div>
  );
}
