import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, LoaderCircle, Mail, MapPin, Send, UserRound, X } from 'lucide-react';
import type { Club } from '../types';
import useModalScrollLock from '../hooks/useModalScrollLock';
import { getStoredVisitorName } from '../utils/visitorAnalytics';

const GMAIL_PATTERN = /^(?!.*\.\.)[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?@gmail\.com$/i;
const isValidGmailAddress = (value: string) => GMAIL_PATTERN.test(value.trim());

type RegistrationLanguage = 'vi' | 'en';

const readRegistrationLanguage = (): RegistrationLanguage => {
  try {
    const translateCookie = decodeURIComponent(
      document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/)?.[1] || ''
    );
    if (translateCookie.endsWith('/en')) return 'en';
  } catch {
    // Fall back to the saved preference when the translate cookie is malformed.
  }
  return localStorage.getItem('vovinam_language') === 'en' ? 'en' : 'vi';
};

const REGISTRATION_COPY = {
  vi: {
    close: 'Đóng form đăng ký', badge: 'Đăng ký tập luyện', title: 'Bắt đầu hành trình Vovinam',
    subtitle: 'Chọn điểm tập phù hợp và chờ xác nhận qua email.', notice: 'Lưu ý:',
    spamBefore: 'Nhớ kiểm tra thư mục', spamAfter: 'để tránh bỏ lỡ thông báo!',
    fullName: 'Họ và tên', fullNamePlaceholder: 'Nguyễn Văn A', email: 'Gmail / Email',
    gmailHelp: 'Nhập đúng địa chỉ Gmail, ví dụ: tennguoidung@gmail.com', club: 'Câu lạc bộ',
    chooseClub: '— Chọn câu lạc bộ muốn tập —', days: 'Ngày tập', hours: 'Giờ tập',
    address: 'Địa chỉ', updating: 'Đang cập nhật', message: 'Nội dung', optional: '(không bắt buộc)',
    messagePlaceholder: 'Điều bạn muốn trao đổi thêm…', sending: 'Đang gửi đăng ký…',
    send: 'Gửi đăng ký tập luyện', invalidGmail: 'Vui lòng nhập đúng địa chỉ Gmail, ví dụ: tennguoidung@gmail.com.',
    submitFailed: 'Không thể gửi đăng ký lúc này.', genericFailed: 'Không thể gửi đăng ký.',
    success: 'Đăng ký thành công! Form sẽ tự đóng.',
    successEmailPending: 'Đăng ký đã được lưu thành công. Hệ thống đang chờ gửi thông báo cho Ban quản trị.'
  },
  en: {
    close: 'Close registration form', badge: 'Training registration', title: 'Begin your Vovinam journey',
    subtitle: 'Choose a suitable training location and wait for confirmation by email.', notice: 'Important:',
    spamBefore: 'Please check your', spamAfter: 'folder so you do not miss our confirmation!',
    fullName: 'Full name', fullNamePlaceholder: 'John Smith', email: 'Gmail / Email',
    gmailHelp: 'Enter a complete Gmail address, for example: username@gmail.com', club: 'Training club',
    chooseClub: '— Choose your preferred training club —', days: 'Training days', hours: 'Training hours',
    address: 'Address', updating: 'Updating', message: 'Message', optional: '(optional)',
    messagePlaceholder: 'Anything else you would like to ask us…', sending: 'Sending registration…',
    send: 'Submit training registration', invalidGmail: 'Please enter a complete Gmail address, for example: username@gmail.com.',
    submitFailed: 'Unable to submit your registration right now.', genericFailed: 'Unable to submit your registration.',
    success: 'Registration successful! This form will close automatically.',
    successEmailPending: 'Your registration was saved successfully. The administrator notification is pending delivery.'
  }
} as const;

export default function TrainingRegistrationModal({ clubs, isOpen, onClose }: { clubs: Club[]; isOpen: boolean; onClose: () => void }) {
  const language = readRegistrationLanguage();
  const copy = REGISTRATION_COPY[language];
  const activeClubs = useMemo(() => clubs.filter(c => c.status !== false), [clubs]);
  const [fullName, setFullName] = useState(''); const [email, setEmail] = useState('');
  const [clubId, setClubId] = useState(''); const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{type:'success'|'error';text:string}|null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const club = activeClubs.find(c => c.id === clubId);
  useModalScrollLock(isOpen, onClose);
  useEffect(() => { if (!isOpen) return; setFullName(current => current.trim() ? current : getStoredVisitorName()); const fn=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()}; window.addEventListener('keydown',fn); setTimeout(()=>panelRef.current?.querySelector<HTMLInputElement>('input')?.focus(),0); return()=>window.removeEventListener('keydown',fn); }, [isOpen]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidGmailAddress(normalizedEmail)) {
      setResult({ type: 'error', text: copy.invalidGmail });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch('/api/training-registrations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email: normalizedEmail, clubId, message })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(language === 'en' ? copy.submitFailed : (payload.error || copy.submitFailed));
      setResult({ type: 'success', text: payload.emailDelivered === false ? copy.successEmailPending : copy.success });
      window.setTimeout(() => {
        setFullName(''); setEmail(''); setClubId(''); setMessage(''); setResult(null); onClose();
      }, 3000);
    } catch (error) {
      setResult({ type: 'error', text: error instanceof Error ? error.message : copy.genericFailed });
    } finally {
      setSubmitting(false);
    }
  };
  if(!isOpen)return null;
  const input='box-border h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold normal-case outline-none transition focus:border-[#0054A6] focus:bg-white focus:ring-4 focus:ring-blue-100';
  return <div className="fixed inset-0 z-[100] flex items-center font-sans justify-center bg-slate-950/55 p-3 backdrop-blur-[3px] sm:p-5" role="dialog" aria-modal="true" translate="no" aria-labelledby="training-registration-title" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div ref={panelRef} className="training-form-scrollbar modal-scroll-region max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white shadow-2xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0054A6] to-[#00366e] px-5 py-5 text-white sm:px-7"><div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#FFF200]/15"/><button type="button" onClick={onClose} aria-label={copy.close} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 hover:bg-white/20"><X className="h-5 w-5"/></button><span className="mb-2 inline-flex rounded-full bg-[#FFF200] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#0054A6]">{copy.badge}</span><h2 id="training-registration-title" className="pr-10 text-xl font-black uppercase sm:text-2xl">{copy.title}</h2><p className="mt-1.5 text-xs text-blue-100">{copy.subtitle}</p><div role="note" className="mt-4 flex items-start gap-2.5 rounded-xl border border-[#FFF200]/55 bg-[#FFF200]/12 px-3 py-2.5 text-xs font-bold leading-relaxed text-[#FFF200] shadow-[0_8px_22px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF200] text-[#003d7a] shadow-[0_4px_12px_rgba(255,242,0,0.28)]"><AlertTriangle className="h-4 w-4 animate-pulse" strokeWidth={2.7}/></span><span className="pt-1"><span className="underline decoration-[#FFF200] decoration-2 underline-offset-2">{copy.notice}</span> {copy.spamBefore} <strong className="rounded-md bg-[#FFF200] px-1.5 py-0.5 uppercase text-[#003d7a] shadow-sm">Spam</strong> {copy.spamAfter}</span></div></div>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-7"><div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="min-w-0 space-y-1.5 text-xs font-black uppercase text-slate-600">{copy.fullName} <span className="text-rose-500">*</span><span className="relative block"><UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input required maxLength={100} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder={copy.fullNamePlaceholder} className={input}/></span></label>
        <label className="min-w-0 space-y-1.5 text-xs font-black uppercase text-slate-600">Gmail / Email <span className="text-rose-500">*</span><span className="relative block"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input required type="email" inputMode="email" autoComplete="email" spellCheck={false} maxLength={74} pattern="(?!.*\.\.)[A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@gmail\.com" title={copy.gmailHelp} value={email} onChange={e=>{e.currentTarget.setCustomValidity('');setEmail(e.target.value)}} onInvalid={e=>e.currentTarget.setCustomValidity(copy.invalidGmail)} placeholder="tennguoidung@gmail.com" className={input}/></span></label></div>
        <label className="block space-y-1.5 text-xs font-black uppercase text-slate-600">{copy.club} <span className="text-rose-500">*</span><select required value={clubId} onChange={e=>setClubId(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold normal-case text-slate-700 outline-none focus:border-[#0054A6] focus:ring-4 focus:ring-blue-100"><option value="">{copy.chooseClub}</option>{activeClubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        {club&&<div className="grid gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-slate-700 sm:grid-cols-2"><div className="flex gap-2"><CalendarDays className="h-4 w-4 text-emerald-600"/><span><strong className="block text-emerald-800">{copy.days}</strong>{club.trainingDays||copy.updating}</span></div><div className="flex gap-2"><Clock className="h-4 w-4 text-emerald-600"/><span><strong className="block text-emerald-800">{copy.hours}</strong>{club.trainingHours||copy.updating}</span></div><div className="flex gap-2 sm:col-span-2"><MapPin className="h-4 w-4 shrink-0 text-emerald-600"/><span><strong className="block text-emerald-800">{copy.address}</strong>{club.address||copy.updating}</span></div></div>}
        <label className="block space-y-1.5 text-xs font-black uppercase text-slate-600">{copy.message} <span className="font-semibold normal-case text-slate-400">{copy.optional}</span><textarea maxLength={1000} rows={3} value={message} onChange={e=>setMessage(e.target.value)} placeholder={copy.messagePlaceholder} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium normal-case outline-none focus:border-[#0054A6] focus:ring-4 focus:ring-blue-100"/></label>
        {result&&<div role="status" aria-live="polite" className={`flex items-center gap-3 rounded-2xl border font-bold ${result.type==='success'?'border-2 border-emerald-300 bg-emerald-50 p-4 text-base text-emerald-800 shadow-[0_8px_24px_rgba(5,150,105,0.14)]':'border-rose-200 bg-rose-50 p-3 text-xs text-rose-700'}`}>{result.type==='success'&&<CheckCircle2 className="h-7 w-7 shrink-0"/>}<span className={result.type==='success'?'leading-snug':'leading-normal'}>{result.text}</span></div>}
        <button disabled={submitting} className={`group relative flex h-[54px] w-full items-center justify-center gap-2 overflow-hidden rounded-xl border border-blue-400/40 border-b-[5px] border-b-[#003b78] bg-gradient-to-b from-[#1689e8] via-[#0874cc] to-[#0054A6] px-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_9px_0_#00315f,0_14px_24px_rgba(0,49,95,0.28),inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_11px_0_#00315f,0_17px_28px_rgba(0,49,95,0.32),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-[5px] active:border-b-0 active:shadow-[0_3px_0_#00315f,0_7px_14px_rgba(0,49,95,0.24)] disabled:cursor-wait disabled:translate-y-[2px] disabled:border-b-[3px] disabled:brightness-100 disabled:shadow-[0_6px_0_#00315f,0_10px_20px_rgba(0,49,95,0.24)] ${submitting?'animate-pulse':''}`}>
          {submitting&&<span aria-hidden="true" className="absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[registration-button-shine_1.15s_ease-in-out_infinite]"/>}
          <span className="relative z-10 flex items-center gap-2 drop-shadow-[0_2px_1px_rgba(0,38,78,0.65)]">
            {submitting?<LoaderCircle className="h-5 w-5 animate-spin"/>:<Send className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/>}
            {submitting ? copy.sending : copy.send}
          </span>
        </button>
      </form></div></div>;
}

TrainingRegistrationModal.displayName = 'TrainingRegistrationModal';
