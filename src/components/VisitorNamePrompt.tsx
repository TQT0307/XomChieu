import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, UserRound } from 'lucide-react';
import { getStoredVisitorName, identifyVisitor } from '../utils/visitorAnalytics';

const PROMPT_SCROLL_THRESHOLD = 24;
const WELCOME_DURATION_MS = 2400;

export default function VisitorNamePrompt({ disabled = false }: { disabled?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [welcomeName, setWelcomeName] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled || getStoredVisitorName() || window.location.hash.startsWith('#admin')) return;

    const maybeOpen = () => {
      if (window.scrollY < PROMPT_SCROLL_THRESHOLD) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      setVisible(true);
      window.removeEventListener('scroll', maybeOpen);
    };

    window.addEventListener('scroll', maybeOpen, { passive: true });
    maybeOpen();
    return () => window.removeEventListener('scroll', maybeOpen);
  }, [disabled]);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 180);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [visible]);

  useEffect(() => {
    if (!disabled) return;
    setVisible(false);
    setWelcomeName('');
  }, [disabled]);

  const submitName = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = visitorName.trim().replace(/\s+/g, ' ').slice(0, 80);
    if (normalizedName.length < 2) {
      setValidationMessage('Vui lòng nhập tên có ít nhất 2 ký tự để tiếp tục.');
      inputRef.current?.focus();
      return;
    }

    identifyVisitor(normalizedName);
    setValidationMessage('');
    setWelcomeName(normalizedName);
    window.setTimeout(() => {
      setVisible(false);
      setWelcomeName('');
    }, WELCOME_DURATION_MS);
  };

  if (!visible || disabled) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-[3px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="visitor-name-title">
      <div className="relative w-full max-w-md overflow-hidden rounded-[1.65rem] border border-white/75 bg-white shadow-[0_24px_70px_rgba(0,35,76,.32)]">
        {welcomeName ? (
          <div className="px-6 py-10 text-center sm:px-8 sm:py-12" role="status" aria-live="polite">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-[0_10px_28px_rgba(5,150,105,.2)]"><CheckCircle2 className="h-9 w-9" strokeWidth={2.6} /></span>
            <h2 className="mt-5 text-2xl font-black leading-tight text-[#0054A6]">Chào mừng!</h2>
            <p className="mt-3 text-base font-semibold leading-relaxed text-slate-700">Chào mừng <strong className="text-lg font-black text-[#003b78]">{welcomeName}</strong> đã đến với CLB Xóm Chiếu.</p>
          </div>
        ) : (
          <>
            <div className="relative overflow-hidden bg-gradient-to-br from-[#0054A6] via-[#075fb5] to-[#00366e] px-5 pb-5 pt-6 text-white sm:px-6">
              <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#FFF200]/15" />
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF200] text-[#004488] shadow-[0_8px_20px_rgba(255,242,0,.24)]"><UserRound className="h-6 w-6" /></div>
              <h2 id="visitor-name-title" className="mt-4 text-xl font-black leading-tight sm:text-2xl">Bạn tên là gì?</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-blue-100">Vui lòng nhập tên để tiếp tục xem website. Thiết bị này chỉ cần nhập một lần.</p>
            </div>
            <form onSubmit={submitName} className="space-y-4 p-5 sm:p-6">
              <label className="block text-xs font-black uppercase tracking-wide text-slate-600">
                Tên người truy cập <span className="text-rose-500">*</span>
                <span className="relative mt-2 block">
                  <UserRound className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input ref={inputRef} required minLength={2} value={visitorName} onChange={event => { setVisitorName(event.target.value); if (validationMessage) setValidationMessage(''); }} maxLength={80} autoComplete="name" placeholder="Ví dụ: Nguyễn Văn An" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-base font-bold normal-case text-slate-800 outline-none transition focus:border-[#0054A6] focus:bg-white focus:ring-4 focus:ring-blue-100" />
                </span>
              </label>
              {validationMessage && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700" role="alert">{validationMessage}</p>}
              <button type="submit" className="h-12 w-full rounded-xl border border-blue-500/40 border-b-4 border-b-[#003b78] bg-gradient-to-b from-[#1689e8] to-[#0054A6] text-sm font-black uppercase tracking-wide text-white shadow-[0_6px_0_#00315f,0_10px_18px_rgba(0,49,95,.22)] transition hover:brightness-110 active:translate-y-1 active:border-b-0 active:shadow-none">Xác nhận và tiếp tục</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
