import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, UserRound, X } from 'lucide-react';

const PROMPT_SCROLL_THRESHOLD = 72;
const VISITOR_NAME_STORAGE_KEY = 'vovinam_visitor_name';
const VISITOR_NAME_DECISION_KEY = 'vovinam_visitor_name_prompted';

const hasCompletedPrompt = () => {
  try {
    return Boolean(
      window.localStorage.getItem(VISITOR_NAME_DECISION_KEY) ||
      window.localStorage.getItem(VISITOR_NAME_STORAGE_KEY)
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

    const maybeOpen = () => {
      if (window.scrollY < PROMPT_SCROLL_THRESHOLD) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      setVisible(true);
      window.removeEventListener('scroll', maybeOpen);
    };

    window.addEventListener('scroll', maybeOpen, { passive: true });
    maybeOpen();
    return () => window.removeEventListener('scroll', maybeOpen);
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
    void import('../utils/visitorAnalytics').then(({ identifyVisitor }) => identifyVisitor('')).catch(() => {
      // Analytics remains best-effort when a browser blocks this optional request.
    });
    setVisible(false);
  };

  const submitName = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = visitorName.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (!normalizedName) {
      inputRef.current?.focus();
      return;
    }
    void import('../utils/visitorAnalytics').then(({ identifyVisitor }) => identifyVisitor(normalizedName)).catch(() => {
      // The public website remains usable if analytics cannot be loaded.
    });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitor-name-title"
      onMouseDown={event => {
        if (event.target === event.currentTarget) skipPrompt();
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.65rem] border border-white/75 bg-white shadow-[0_24px_70px_rgba(0,35,76,.28)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0054A6] via-[#075fb5] to-[#00366e] px-5 pb-5 pt-6 text-white sm:px-6">
          <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#FFF200]/15" />
          <button
            type="button"
            onClick={skipPrompt}
            aria-label="Bỏ qua và đóng"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-white/10 transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF200] text-[#004488] shadow-[0_8px_20px_rgba(255,242,0,.24)]">
            <UserRound className="h-6 w-6" />
          </div>
          <h2 id="visitor-name-title" className="mt-4 pr-10 text-xl font-black leading-tight sm:text-2xl">
            Bạn tên là gì?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-blue-100">
            Nhập tên để Ban quản trị nhận biết lượt ghé thăm của bạn. Bạn hoàn toàn có thể bỏ qua.
          </p>
        </div>

        <form onSubmit={submitName} className="space-y-4 p-5 sm:p-6">
          <label className="block text-xs font-black uppercase tracking-wide text-slate-600">
            Tên người truy cập <span className="font-semibold normal-case text-slate-400">(không bắt buộc)</span>
            <span className="relative mt-2 block">
              <UserRound className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={visitorName}
                onChange={event => setVisitorName(event.target.value)}
                maxLength={80}
                autoComplete="name"
                placeholder="Ví dụ: Nguyễn Văn An"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-base font-bold normal-case text-slate-800 outline-none transition focus:border-[#0054A6] focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </span>
          </label>

          <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs leading-relaxed text-emerald-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Tên chỉ được lưu khi bạn tự nguyện nhập; website không lấy Gmail, avatar hay IP đầy đủ.</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={skipPrompt}
              className="h-11 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Bỏ qua
            </button>
            <button
              type="submit"
              className="h-11 rounded-xl border border-blue-500/40 border-b-4 border-b-[#003b78] bg-gradient-to-b from-[#1689e8] to-[#0054A6] text-sm font-black text-white shadow-[0_6px_0_#00315f,0_10px_18px_rgba(0,49,95,.22)] transition hover:brightness-110 active:translate-y-1 active:border-b-0 active:shadow-none"
            >
              Ghi nhận tên
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
