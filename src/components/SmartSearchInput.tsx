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
      <div className={`relative flex items-center rounded-2xl border shadow-md transition-all focus-within:ring-4 ${frameClass}`}>
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Search className={`h-4 w-4 text-slate-400 ${isDark ? 'group-focus-within:text-[#FFF200]' : ''}`} />
        </span>
        <input
          type="text"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          className={`w-full rounded-2xl bg-transparent py-3.5 pl-11 pr-28 text-xs font-semibold outline-none sm:text-sm ${inputClass}`}
        />
        <div className="absolute right-2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-500/10 hover:text-current"
              title="Xóa tìm kiếm"
              aria-label="Xóa tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {resultCount !== undefined && (
            <span className={`min-w-7 rounded-md border px-2 py-1 text-center text-[10px] font-black ${
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
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-[#FFF200] hover:bg-slate-800'
                : 'border-slate-200 bg-white text-[#0054A6] hover:bg-blue-50'
            }`}
            title="Hiển thị tất cả dữ liệu"
            aria-label="Hiển thị tất cả dữ liệu"
            aria-expanded={isOpen}
          >
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {helperText && <p className="mt-2 text-[10px] text-slate-500">{helperText}</p>}

      {isOpen && (
        <div className={`absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-2xl border shadow-2xl ${
          isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'
        }`}>
          <div className={`flex items-center justify-between border-b px-4 py-2.5 text-[10px] font-black uppercase tracking-wider ${
            isDark ? 'border-slate-800 text-[#FFF200]' : 'border-slate-100 text-[#0054A6]'
          }`}>
            <span>Tất cả dữ liệu</span>
            <span>{options.length} bản ghi</span>
          </div>
          <div className="max-h-72 overflow-y-auto overscroll-contain p-2">
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
                className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  isDark ? 'hover:bg-slate-900' : 'hover:bg-blue-50'
                }`}
              >
                <span className={`min-w-0 flex-1 truncate text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
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

