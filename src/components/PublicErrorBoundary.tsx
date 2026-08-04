import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface PublicErrorBoundaryState {
  hasError: boolean;
}

export default class PublicErrorBoundary extends Component<
  { children: ReactNode },
  PublicErrorBoundaryState
> {
  declare readonly props: { children: ReactNode };
  state: PublicErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): PublicErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Giao diện người dùng gặp lỗi runtime.', error, info);
  }

  private restoreVietnamese = () => {
    try {
      localStorage.setItem('vovinam_language', 'vi');
      const expires = 'Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = `googtrans=; expires=${expires}; path=/; SameSite=Lax`;
      document.cookie = `googtrans=; expires=${expires}; domain=${window.location.hostname}; path=/; SameSite=Lax`;
    } finally {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="min-h-[70vh] bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-xl font-black text-slate-900">Website cần tải lại</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Dịch vụ chuyển ngôn ngữ vừa gặp lỗi. Dữ liệu của website vẫn an toàn.
          </p>
          <button type="button" onClick={this.restoreVietnamese} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0054A6] px-5 py-2.5 text-xs font-black text-white transition hover:bg-blue-800">
            <RefreshCw className="h-4 w-4" />
            Khôi phục tiếng Việt
          </button>
        </div>
      </section>
    );
  }
}