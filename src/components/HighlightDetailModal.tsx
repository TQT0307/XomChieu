import React, { useState } from 'react';
import { X, Play, Image as ImageIcon, Film, User, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { Highlight } from '../types';

interface HighlightDetailModalProps {
  highlight: Highlight | null;
  onClose: () => void;
}

export default function HighlightDetailModal({ highlight, onClose }: HighlightDetailModalProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  if (!highlight) return null;

  const mediaList = highlight.mediaUrls && highlight.mediaUrls.length > 0 
    ? highlight.mediaUrls 
    : [highlight.thumbnail];

  const handleNext = () => {
    setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  const handlePrev = () => {
    setActiveMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const isVideoUrl = (url: string) => {
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || url.includes('mov_bbb') || url.includes('movie.mp4') || url.startsWith('data:video');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        
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
        <div className="relative bg-black min-h-[300px] sm:min-h-[450px] flex items-center justify-center group">
          {/* Main Media Display */}
          <div className="w-full h-full max-h-[500px] flex items-center justify-center overflow-hidden">
            {isVideoUrl(mediaList[activeMediaIndex]) ? (
              <video 
                src={mediaList[activeMediaIndex]} 
                controls 
                autoPlay 
                className="w-full max-h-[500px] object-contain"
              />
            ) : (
              <img 
                src={mediaList[activeMediaIndex]} 
                alt={`${highlight.title} - ${activeMediaIndex + 1}`} 
                className="w-full max-h-[500px] object-contain"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {/* Navigation Arrows for Multiple Media */}
          {mediaList.length > 1 && (
            <>
              <button 
                onClick={handlePrev}
                className="absolute left-4 bg-black/60 hover:bg-black/90 text-white p-3 rounded-full transition-all border border-slate-700 cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleNext}
                className="absolute right-4 bg-black/60 hover:bg-black/90 text-white p-3 rounded-full transition-all border border-slate-700 cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Media Count Indicator */}
          <div className="absolute bottom-4 right-4 bg-black/70 text-xs px-3 py-1 rounded-full border border-slate-700">
            {activeMediaIndex + 1} / {mediaList.length}
          </div>
        </div>

        {/* Thumbnails Strip / Multi-Media Selector */}
        {mediaList.length > 1 && (
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-2 font-semibold">Tất cả tư liệu bài viết ({mediaList.length}):</p>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {mediaList.map((mediaUrl, idx) => {
                const isVid = isVideoUrl(mediaUrl);
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveMediaIndex(idx)}
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
