import React, { useEffect, useRef, useState } from 'react';
import { UserRound, X, Sparkles, ArrowRight } from 'lucide-react';

const VISITOR_NAME_STORAGE_KEY = 'vovinam_visitor_name';
const VISITOR_NAME_DECISION_KEY = 'vovinam_visitor_name_prompted';

const hasCompletedPrompt = () => {
  try {
    const storedName = window.localStorage.getItem(VISITOR_NAME_STORAGE_KEY);
    const persistentDecision = window.localStorage.getItem(VISITOR_NAME_DECISION_KEY);

    if (persistentDecision === 'skipped') {
      window.localStorage.removeItem(VISITOR_NAME_DECISION_KEY);
    }

    return Boolean(
      storedName ||
      persistentDecision === 'named' ||
      window.sessionStorage.getItem(VISITOR_NAME_DECISION_KEY)
    );
  } catch {
    return false;
  }
};

export default function VisitorNamePrompt() {
  const [visible, setVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hasCompletedPrompt() || window.location.hash.startsWith('#admin')) return;

    const showTimer = window.setTimeout(() => {
      if (!document.querySelector('[role="dialog"][aria-modal="true"]')) setVisible(true);
    }, 180);

    return () => window.clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 180);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skipPrompt();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [visible]);

  const skipPrompt = () => {
    void import('../utils/visitorAnalytics').then(({ identifyVisitor }) => identifyVisitor('')).catch(() => {});
    setVisible(false);
  };

  const submitName = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = visitorName.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!normalizedName) {
      inputRef.current?.focus();
      return;
    }
    void import('../utils/visitorAnalytics').then(({ identifyVisitor }) => identifyVisitor(normalizedName)).catch(() => {});
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitor-name-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) skipPrompt();
      }}
    >
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_25px_60px_-15px_rgba(0,35,76,0.35)]">
        
        {/* Header với hiệu ứng gradient Vovinam */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0054A6] via-[#004285] to-[#002b59] px-6 pb-6 pt-7 text-white">
          <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-[#FFF200]/15 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-blue-400/10 blur-xl" />
          
          <button
            type="button"
            onClick={skipPrompt}
            aria-label="Bỏ qua và đóng"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF200] text-[#004488] shadow-lg shadow-yellow-500/20">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFF200]">
                <Sparkles className="h-3 w-3" /> Xin chào bạn
              </span>
              <h2 id="visitor-name-title" className="text-xl font-black tracking-tight sm:text-2xl">
                Bạn tên là gì?
              </h2>
            </div>
          </div>
          
          <p className="mt-3 text-xs leading-relaxed text-blue-100/90">
            Hãy cho CLB Vovinam Xóm Chiếu biết tên để có trải nghiệm xưng hô tốt nhất nhé!
          </p>
        </div>

        {/* Form nhập liệu */}
        <form onSubmit={submitName} className="space-y-5 p-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Tên người truy cập
            </label>
            <div className="relative">
              <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={visitorName}
                onChange={event => setVisitorName(event.target.value)}
                maxLength={80}
                autoComplete="name"
                placeholder="Ví dụ: Nguyễn Văn An"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-11 pr-4 text-sm font-bold text-slate-800 transition placeholder:font-normal placeholder:text-slate-400 focus:border-[#0054A6] focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={skipPrompt}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              className="group flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0054A6] to-[#003d7a] text-xs font-black text-white shadow-md shadow-blue-900/20 transition hover:brightness-110 active:scale-[0.98]"
            >
              <span>Xác nhận</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </form>
        
      </div>
    </div>
  );
}