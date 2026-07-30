import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { matchesSmartSearch } from '../utils/smartSearch';

interface SearchableTextComboboxProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
}

export default function SearchableTextCombobox({ label, value, options, onChange, placeholder = 'Tìm hoặc nhập nội dung mới...', helperText }: SearchableTextComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const filteredOptions = useMemo(
    () => options.filter(option => matchesSmartSearch(value, option)).slice(0, 10),
    [options, value]
  );

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-amber-800">{label}</label>
      <div className={`flex items-center rounded-xl border bg-white transition ${isOpen ? 'border-amber-500 ring-2 ring-amber-300/30' : 'border-amber-300 hover:border-amber-400'}`}>
        <Search className="ml-3 h-4 w-4 shrink-0 text-amber-600" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={event => { onChange(event.target.value); setIsOpen(true); }}
          onKeyDown={event => {
            if (event.key === 'Escape') setIsOpen(false);
            if (event.key === 'Enter' && filteredOptions.length === 1) {
              event.preventDefault();
              onChange(filteredOptions[0]);
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"
          role="combobox"
          aria-expanded={isOpen}
        />
        {value && (
          <button type="button" onClick={() => { onChange(''); inputRef.current?.focus(); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500" aria-label="Xóa giải đấu đã chọn" title="Xóa nội dung đã chọn">
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => { setIsOpen(open => !open); inputRef.current?.focus(); }} className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700" aria-label="Mở danh sách giải đấu">
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {helperText && <p className="mt-1.5 text-[10px] text-amber-700/80">{helperText}</p>}
      {isOpen && (
        <div className="absolute z-[90] mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between border-b bg-amber-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-800">
            <span>{value ? 'Kết quả phù hợp' : 'Giải đấu gần đây'}</span>
            <span>{filteredOptions.length}/{options.length}</span>
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-5 text-center text-xs text-slate-500">Không có tên cũ phù hợp. Nội dung đang nhập sẽ được dùng làm tên giải mới.</p>
            ) : filteredOptions.map(option => (
              <button key={option} type="button" onClick={() => { onChange(option); setIsOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition ${option === value ? 'bg-amber-50 font-bold text-amber-900' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span className="text-sm">🏆</span>
                <span className="min-w-0 flex-1 truncate">{option}</span>
                {option === value && <Check className="h-4 w-4 shrink-0 text-amber-600" />}
              </button>
            ))}
          </div>
          {options.length > 10 && !value && <p className="border-t bg-slate-50 px-3 py-2 text-center text-[10px] text-slate-500">Nhập vài ký tự để tìm nhanh.</p>}
        </div>
      )}
    </div>
  );
}