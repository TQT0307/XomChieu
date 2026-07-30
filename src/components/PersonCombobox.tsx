import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { matchesSmartSearch } from '../utils/smartSearch';

export interface PersonOption {
  id: string;
  fullName: string;
  rank?: string;
  photo?: string;
  profileType: 'coach' | 'member';
}

interface PersonComboboxProps {
  people: PersonOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  multiple?: boolean;
  label: string;
  placeholder?: string;
  emptyText?: string;
}

export default function PersonCombobox({
  people,
  selectedIds,
  onChange,
  multiple = false,
  label,
  placeholder = 'Tìm theo ID hoặc họ tên...',
  emptyText = 'Không tìm thấy hồ sơ phù hợp.'
}: PersonComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedPeople = useMemo(
    () => selectedIds.map(id => people.find(person => person.id === id)).filter(Boolean) as PersonOption[],
    [people, selectedIds]
  );
  const filteredPeople = useMemo(
    () => people
      .filter(person => matchesSmartSearch(
        query,
        person.id,
        person.fullName,
        person.rank,
        person.profileType === 'coach' ? 'huấn luyện viên hlv' : 'thành viên môn sinh'
      ))
      .slice(0, 12),
    [people, query]
  );

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  const selectPerson = (person: PersonOption) => {
    if (multiple) {
      onChange(selectedIds.includes(person.id)
        ? selectedIds.filter(id => id !== person.id)
        : [...selectedIds, person.id]);
      setQuery('');
      inputRef.current?.focus();
      return;
    }
    onChange([person.id]);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-[#0054A6]">{label}</label>
      {multiple && selectedPeople.length > 0 && (
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {selectedPeople.map(person => (
            <div key={`confirmed-${person.profileType}-${person.id}`} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-[9px] font-black text-emerald-700">
                {person.photo ? (
                  <img src={person.photo} alt="" className="h-full w-full object-cover" loading="eager" decoding="async" fetchPriority="high" />
                ) : person.profileType === 'coach' ? 'HLV' : 'TV'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-emerald-900">{person.fullName}</p>
                <p className="truncate text-[10px] text-emerald-700">{person.profileType === 'coach' ? 'Huấn luyện viên' : 'Thành viên'} · ID {person.id}{person.rank ? ` · ${person.rank}` : ''}</p>
              </div>
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            </div>
          ))}
        </div>
      )}
      <div className={`flex items-center rounded-xl border bg-white transition ${isOpen ? 'border-[#0054A6] ring-2 ring-[#0054A6]/15' : 'border-slate-300 hover:border-[#0054A6]/50'}`}>
        <Search className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={event => { setQuery(event.target.value); setIsOpen(true); }}
          onKeyDown={event => {
            if (event.key === 'Escape') setIsOpen(false);
            if (event.key === 'Enter' && filteredPeople.length === 1) {
              event.preventDefault();
              selectPerson(filteredPeople[0]);
            }
          }}
          placeholder={!multiple && selectedPeople[0] ? `${selectedPeople[0].fullName} (${selectedPeople[0].id})` : placeholder}
          className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-slate-400"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />
        {selectedPeople.length > 0 && !query && (
          <button type="button" onClick={() => { onChange([]); inputRef.current?.focus(); }} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500" title={multiple ? 'Xóa toàn bộ lựa chọn' : 'Bỏ lựa chọn'} aria-label={multiple ? 'Xóa toàn bộ người đã chọn' : 'Bỏ người đã chọn'}>
            <X className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => { setIsOpen(open => !open); inputRef.current?.focus(); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Mở danh sách">
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {!multiple && selectedPeople[0] && !query && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-[10px] font-black text-emerald-700">
            {selectedPeople[0].photo ? <img src={selectedPeople[0].photo} alt="" className="h-full w-full object-cover" loading="eager" decoding="async" fetchPriority="high" /> : selectedPeople[0].profileType === 'coach' ? 'HLV' : 'TV'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-emerald-900">{selectedPeople[0].fullName}</p>
            <p className="truncate text-[10px] text-emerald-700">{selectedPeople[0].profileType === 'coach' ? 'Huấn luyện viên' : 'Thành viên'} · ID {selectedPeople[0].id}{selectedPeople[0].rank ? ` · ${selectedPeople[0].rank}` : ''}</p>
          </div>
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
        </div>
      )}
      {isOpen && (
        <div className="absolute z-[80] mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <span>{query ? `Kết quả cho “${query}”` : 'Danh sách hồ sơ'}</span>
            <span>{filteredPeople.length}/{people.length}</span>
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filteredPeople.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-500">{emptyText}</p>
            ) : filteredPeople.map(person => {
              const selected = selectedIds.includes(person.id);
              return (
                <button
                  key={`${person.profileType}-${person.id}`}
                  type="button"
                  onClick={() => selectPerson(person)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${selected ? 'bg-blue-50 text-[#0054A6]' : 'hover:bg-slate-50'}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[9px] font-black ${person.profileType === 'coach' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {person.photo ? <img src={person.photo} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : person.profileType === 'coach' ? 'HLV' : 'TV'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-800">{person.fullName}</span>
                    <span className="block truncate text-[10px] text-slate-500">{person.profileType === 'coach' ? 'Huấn luyện viên' : 'Thành viên'} · {person.id}{person.rank ? ` · ${person.rank}` : ''}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
          {people.length > 12 && !query && <p className="border-t bg-slate-50 px-3 py-2 text-center text-[10px] text-slate-500">Nhập ID hoặc tên để lọc nhanh danh sách.</p>}
        </div>
      )}
    </div>
  );
}