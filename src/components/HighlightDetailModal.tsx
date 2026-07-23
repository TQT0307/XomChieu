import React, { useEffect, useRef, useState } from 'react';
import {
  X, Play, Image as ImageIcon, Film, User, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RotateCcw, Move
} from 'lucide-react';
import { Highlight } from '../types';

interface HighlightDetailModalProps {
  highlight: Highlight | null;
  onClose: () => void;
}

export default function HighlightDetailModal({ highlight, onClose }: HighlightDetailModalProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const mediaViewportRef = useRef<HTMLDivElement>(null);
  const imageBaseSizeRef = useRef({ width: 0, height: 0 });
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, imageX: 0, imageY: 0 });

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [highlight?.id]);

  useEffect(() => {
    setZoom(1);
    setMaxZoom(1);
    setImageOffset({ x: 0, y: 0 });
    setIsDraggingImage(false);
  }, [highlight?.id, activeMediaIndex]);

  if (!highlight) return null;

  const mediaList = highlight.mediaUrls && highlight.mediaUrls.length > 0 
    ? highlight.mediaUrls 
    : [highlight.thumbnail];
  const activeMediaNote = highlight.mediaNotes?.[activeMediaIndex]?.trim() || '';

  const handleNext = () => {
    setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  const handlePrev = () => {
    setActiveMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const clampImageOffset = (x: number, y: number, targetZoom: number) => {
    const viewport = mediaViewportRef.current;
    const baseSize = imageBaseSizeRef.current;
    if (!viewport || baseSize.width === 0 || baseSize.height === 0) return { x: 0, y: 0 };

    const maxX = Math.max(0, (baseSize.width * targetZoom - viewport.clientWidth) / 2);
    const maxY = Math.max(0, (baseSize.height * targetZoom - viewport.clientHeight) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  };

  const changeZoom = (nextZoom: number) => {
    const limitedZoom = Math.max(1, Math.min(maxZoom, nextZoom));
    setZoom(limitedZoom);
    setImageOffset(previous => clampImageOffset(previous.x, previous.y, limitedZoom));
  };

  const resetImageView = () => {
    setZoom(1);
    setImageOffset({ x: 0, y: 0 });
  };

  const isVideoUrl = (url: string) => {
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || url.includes('mov_bbb') || url.includes('movie.mp4') || url.startsWith('data:video');
  };

  return (
    <div className="detail-scrollbar fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-800 text-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-600 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header bar */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-[#FFF200] text-slate-900 text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-wider">
              {highlight.mediaType === 'video' ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
              {highlight.mediaType === 'video' ? 'Video Highlight' : 'Bộ Sưu Tập Ảnh'}
            </span>
            <h3 className="text-lg sm:text-xl font-bold mt-1 text-[#FFF200] leading-tight">
              {highlight.title}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <User className="w-3 h-3 text-[#0054A6]" />
              VĐV thực hiện: <span className="font-bold text-slate-200">{highlight.athleteName}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Viewer Arena */}
        <div className="relative bg-slate-900 h-[50vh] min-h-[320px] max-h-[600px] flex items-center justify-center group">
          {/* Main Media Display */}
          <div
            ref={mediaViewportRef}
            className="w-full h-full flex items-center justify-center overflow-hidden"
          >
            {isVideoUrl(mediaList[activeMediaIndex]) ? (
              <video 
                src={mediaList[activeMediaIndex]} 
                controls 
                autoPlay 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <img 
                src={mediaList[activeMediaIndex]} 
                alt={`${highlight.title} - ${activeMediaIndex + 1}`} 
                draggable={false}
                onLoad={event => {
                  const image = event.currentTarget;
                  const width = image.offsetWidth;
                  const height = image.offsetHeight;
                  imageBaseSizeRef.current = { width, height };
                  const nativeZoomLimit = Math.min(
                    image.naturalWidth / Math.max(1, width),
                    image.naturalHeight / Math.max(1, height)
                  );
                  setMaxZoom(Math.max(1, Math.min(4, nativeZoomLimit)));
                }}
                onDoubleClick={() => changeZoom(zoom > 1 ? 1 : Math.min(2, maxZoom))}
                onPointerDown={event => {
                  if (zoom <= 1) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  dragStartRef.current = {
                    pointerX: event.clientX,
                    pointerY: event.clientY,
                    imageX: imageOffset.x,
                    imageY: imageOffset.y
                  };
                  setIsDraggingImage(true);
                }}
                onPointerMove={event => {
                  if (!isDraggingImage) return;
                  const start = dragStartRef.current;
                  setImageOffset(clampImageOffset(
                    start.imageX + event.clientX - start.pointerX,
                    start.imageY + event.clientY - start.pointerY,
                    zoom
                  ));
                }}
                onPointerUp={event => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                  setIsDraggingImage(false);
                }}
                onPointerCancel={() => setIsDraggingImage(false)}
                className={`max-w-full max-h-full object-contain select-none ${
                  zoom > 1 ? (isDraggingImage ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
                }`}
                style={{
                  transform: `translate3d(${imageOffset.x}px, ${imageOffset.y}px, 0) scale(${zoom})`,
                  transformOrigin: 'center',
                  transition: isDraggingImage ? 'none' : 'transform 160ms ease-out',
                  imageRendering: 'auto',
                  touchAction: zoom > 1 ? 'none' : 'auto'
                }}
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {!isVideoUrl(mediaList[activeMediaIndex]) && (
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-xl border border-slate-600 bg-slate-800/90 p-1.5 shadow-lg">
              <button
                type="button"
                onClick={() => changeZoom(zoom - 0.25)}
                disabled={zoom <= 1}
                title="Thu nhỏ ảnh"
                className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="min-w-12 text-center text-[10px] font-bold text-white">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => changeZoom(zoom + 0.25)}
                disabled={zoom >= maxZoom - 0.01}
                title="Phóng to theo độ phân giải gốc"
                className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={resetImageView}
                disabled={zoom === 1 && imageOffset.x === 0 && imageOffset.y === 0}
                title="Đặt lại vị trí ảnh"
                className="p-2 rounded-lg text-white hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Arrows for Multiple Media */}
          {mediaList.length > 1 && (
            <>
              <button 
                onClick={handlePrev}
                className="absolute left-4 bg-slate-800/85 hover:bg-slate-700 text-white p-3 rounded-full transition-all border border-slate-600 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleNext}
                className="absolute right-4 bg-slate-800/85 hover:bg-slate-700 text-white p-3 rounded-full transition-all border border-slate-600 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Media Count Indicator */}
          <div className="absolute bottom-4 right-4 bg-slate-800/90 text-xs px-3 py-1 rounded-full border border-slate-600">
            {activeMediaIndex + 1} / {mediaList.length}
          </div>

          {!isVideoUrl(mediaList[activeMediaIndex]) && zoom > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800/90 px-3 py-1 text-[10px] text-slate-100 pointer-events-none">
              <Move className="w-3 h-3" />
              Kéo ảnh để căn vị trí
            </div>
          )}
        </div>

        {/* The note always follows the currently selected image. */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#FFF200] mb-1">
            Ghi chú ảnh {activeMediaIndex + 1}/{mediaList.length}
          </p>
          <p className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
            activeMediaNote ? 'text-slate-200' : 'text-slate-500 italic'
          }`}>
            {activeMediaNote || 'Ảnh này chưa có ghi chú.'}
          </p>
        </div>

        {/* Thumbnails Strip / Multi-Media Selector */}
        {mediaList.length > 1 && (
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-2 font-semibold">Tất cả tư liệu bài viết ({mediaList.length}):</p>
            <div className="detail-scrollbar flex gap-2.5 overflow-x-auto pb-2">
              {mediaList.map((mediaUrl, idx) => {
                const isVid = isVideoUrl(mediaUrl);
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveMediaIndex(idx)}
                    title={highlight.mediaNotes?.[idx] || `Tư liệu ${idx + 1}`}
                    className={`relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                      activeMediaIndex === idx ? 'border-[#FFF200] scale-105 shadow' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isVid ? (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <Play className="w-4 h-4 text-[#FFF200]" />
                      </div>
                    ) : (
                      <img 
                        src={mediaUrl} 
                        alt="thumbnail" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Extra info/footer */}
        <div className="p-6 bg-slate-900 border-t border-slate-800 text-sm text-slate-400">
          <p>
            Mục Highlight của CLB Vovinam Xóm Chiếu ghi dấu ấn những đòn đánh điêu luyện, hội diễn nghệ thuật, và những khoảnh khắc võ thuật quý giá. Hãy rèn luyện siêng năng để ghi danh tên mình lên bảng vàng của võ đường!
          </p>
        </div>

      </div>
    </div>
  );
}
