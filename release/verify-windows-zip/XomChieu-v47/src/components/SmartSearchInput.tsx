import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';

export interface SmartSearchOption {
  key: string;
  label: string;
  value: string;
  meta?: string;
}

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  options: SmartSearchOption[];
  placeholder: string;
  ariaLabel: string;
  resultCount?: number;
  label?: string;
  helperText?: string;
  theme?: 'light' | 'dark' | 'admin';
  className?: string;
}

export default function SmartSearchInput({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  resultCount,
  label,
  helperText,
  theme = 'light',
  className = ''
}: SmartSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const frameClass = isDark
    ? 'bg-slate-950 border-slate-800 hover:border-slate-700 focus-within:border-[#FFF200] focus-within:ring-[#FFF200]/10'
    : theme === 'admin'
      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100/50 focus-within:bg-white focus-within:border-[#0054A6] focus-within:ring-[#0054A6]/10'
      : 'bg-white border-slate-200 hover:border-slate-300 focus-within:border-[#0054A6] focus-within:ring-[#0054A6]/10';
  const inputClass = isDark
    ? 'text-white placeholder:text-slate-600'
    : 'text-slate-800 placeholder:text-slate-400';
  const accentClass = isDark ? 'text-[#FFF200]' : 'text-[#0054A6]';

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label && (
        <label className={`mb-2 block text-[10px] font-black uppercase tracking-wider ${accentClass}`}>
          {label}
        </label>
      )}
      <div className={`relative flex items-center rounded-xl border shadow-sm transition-all focus-within:ring-2 ${frameClass}`}>
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className={`h-3.5 w-3.5 text-slate-400 ${isDark ? 'group-focus-within:text-[#FFF200]' : ''}`} />
        </span>
        <input
          type="text"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          className={`w-full rounded-xl bg-transparent py-2.5 pl-10 pr-24 text-[11px] font-semibold outline-none sm:text-xs ${inputClass}`}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-500/10 hover:text-current"
              title="Xóa tìm kiếm"
              aria-label="Xóa tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {resultCount !== undefined && (
            <span className={`min-w-6 rounded-md border px-1.5 py-0.5 text-center text-[9px] font-black ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-[#FFF200]'
                : 'border-slate-200 bg-slate-50 text-[#0054A6]'
            }`}>
              {resultCount}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(current => !current)}
            className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-[#FFF200] hover:bg-slate-800'
                : 'border-slate-200 bg-white text-[#0054A6] hover:bg-blue-50'
            }`}
            title="Hiển thị tất cả dữ liệu"
            aria-label="Hiển thị tất cả dữ liệu"
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {helperText && <p className="mt-2 text-[10px] text-slate-500">{helperText}</p>}

      {isOpen && (
        <div className={`relative z-20 mt-1.5 overflow-hidden rounded-xl border shadow-lg ${
          isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'
        }`}>
          <div className={`flex items-center justify-between border-b px-3.5 py-2 text-[9px] font-black uppercase tracking-wider ${
            isDark ? 'border-slate-800 text-[#FFF200]' : 'border-slate-100 text-[#0054A6]'
          }`}>
            <span>Tất cả dữ liệu</span>
            <span>{options.length} bản ghi</span>
          </div>
          <div className={`smart-search-scrollbar max-h-56 overflow-y-auto overscroll-contain p-1.5 ${
            isDark ? 'smart-search-scrollbar-dark' : ''
          }`}>
            {options.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">Chưa có dữ liệu trong mục này.</p>
            ) : options.map(option => (
              <button
                type="button"
                key={option.key}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${
                  isDark ? 'hover:bg-slate-900' : 'hover:bg-blue-50'
                }`}
              >
                <span className={`min-w-0 flex-1 truncate text-[11px] font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  {option.label}
                </span>
                {option.meta && (
                  <span className="max-w-[45%] truncate text-[10px] text-slate-400">{option.meta}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
