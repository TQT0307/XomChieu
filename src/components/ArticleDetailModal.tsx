import React from 'react';
import { X, Calendar, Eye, Share2, Award, ArrowLeft } from 'lucide-react';
import { Article, Category } from '../types';

interface ArticleDetailModalProps {
  article: Article | null;
  categories: Category[];
  onClose: () => void;
}

export default function ArticleDetailModal({ article, categories, onClose }: ArticleDetailModalProps) {
  if (!article) return null;

  const categoryName = categories.find(c => c.id === article.categoryId)?.name || 'Tin tức';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner Image */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden">
          <img 
            src={article.image || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80'} 
            alt={article.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
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
            <span className="flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
              ID: #{article.id}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0054A6]" />
              {new Date(article.date).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-[#0054A6]" />
              {article.views + 1} lượt xem
            </span>
          </div>

          {/* Newspaper Layout Content */}
          <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed text-sm sm:text-base space-y-4 font-sans">
            {article.content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="first-letter:text-4xl first-letter:font-black first-letter:text-[#0054A6] first-letter:mr-3 first-letter:float-left first-letter:h-12 first-letter:uppercase">
                {index === 0 ? paragraph : paragraph}
              </p>
            ))}
          </div>

          {/* Footer of the article */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại trang tin</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
