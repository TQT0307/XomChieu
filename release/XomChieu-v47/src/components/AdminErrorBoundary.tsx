import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Undo2 } from 'lucide-react';

interface AdminErrorBoundaryProps {
  children: ReactNode;
  onBackToWebsite: () => void;
}

interface AdminErrorBoundaryState {
  hasError: boolean;
}

export default class AdminErrorBoundary extends Component<
  AdminErrorBoundaryProps,
  AdminErrorBoundaryState
> {
  declare readonly props: AdminErrorBoundaryProps;
  state: AdminErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AdminErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Trang quản trị gặp lỗi khi tải.', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <section className="min-h-[70vh] bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-white p-7 text-center shadow-xl">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-xl font-black text-slate-900">
            Trang quản trị chưa tải được
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Dữ liệu không bị thay đổi. Hãy tải lại trang; nếu lỗi vẫn còn, bạn có thể quay về website.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0054A6] px-5 py-2.5 text-xs font-black text-white transition hover:bg-blue-800"
            >
              <RefreshCw className="h-4 w-4" />
              Tải lại Admin
            </button>
            <button
              type="button"
              onClick={this.props.onBackToWebsite}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
            >
              <Undo2 className="h-4 w-4" />
              Quay về website
            </button>
          </div>
        </div>
      </section>
    );
  }
}
