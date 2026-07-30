import React from 'react';
import { X, Calendar, Eye } from 'lucide-react';
import { Article, Category } from '../types';
import { sanitizeArticleHtml } from '../utils/articleContent';
import DetailHeroImage from './DetailHeroImage';
import useModalScrollLock from '../hooks/useModalScrollLock';

interface ArticleDetailModalProps {
  article: Article | null;
  categories: Category[];
  onClose: () => void;
}

export default function ArticleDetailModal({ article, categories, onClose }: ArticleDetailModalProps) {
  useModalScrollLock(Boolean(article));

  if (!article) return null;

  const categoryName = categories.find(c => c.id === article.categoryId)?.name || 'Tin tức';
  const safeArticleContent = sanitizeArticleHtml(article.content);

  return (
    <div
      className="modal-scroll-lock fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden"
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
        aria-label="Đóng cửa sổ chi tiết bài viết"
      />
      <div className="modal-scroll-region detail-scrollbar relative z-10 bg-white rounded-3xl max-w-3xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner Image */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <DetailHeroImage
            src={article.image || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80'}
            alt={article.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          
          {/* Category Badge */}
          <span className="absolute top-4 left-4 bg-[#0054A6] text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border border-[#FFF200]">
            {categoryName}
          </span>

          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all border border-white/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title Overlay */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight tracking-tight uppercase italic drop-shadow-md text-[#FFF200]">
              {article.title}
            </h2>
          </div>
        </div>

        {/* Article Metadata & Content */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pb-4 mb-6 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0054A6]" />
              {new Date(article.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#0054A6]" />
              {Math.max(0, Number(article.views) || 0)} lượt xem
            </span>
          </div>

          <div
            className="article-content max-w-none text-slate-700 text-sm sm:text-base font-sans"
            dangerouslySetInnerHTML={{ __html: safeArticleContent }}
          />

        </div>

      </div>
    </div>
  );
}
