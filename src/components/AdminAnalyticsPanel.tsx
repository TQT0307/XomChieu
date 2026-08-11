import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, Clock3, Eye, Laptop, Monitor, RefreshCw,
  Smartphone, Tablet, TrendingUp, Users
} from 'lucide-react';

type AnalyticsDay = {
  date: string;
  pageviews: number;
  sessions: number;
  visitors: number;
};

type AnalyticsVisitor = {
  visitorCode: string;
  firstSeenAt: string;
  lastSeenAt: string;
  totalPageviews: number;
  totalSessions: number;
  currentPath: string;
  device: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  language: string;
  referrerHost: string;
};

type AnalyticsPayload = {
  summary: {
    totalPageviews: number;
    totalSessions: number;
    totalVisitors: number;
    activeVisitors: number;
    updatedAt: string;
    today: AnalyticsDay;
  };
  days: AnalyticsDay[];
  recentVisitors: AnalyticsVisitor[];
  storage: 'firebase' | 'memory';
};

const sectionLabels: Record<string, string> = {
  '#section-about': 'Giới thiệu',
  '#section-news': 'Tin tức',
  '#section-tournaments': 'Giải đấu',
  '#section-highlights': 'Highlights',
  '#section-achievements': 'Thành tích',
  '#section-coaches': 'Huấn luyện viên',
  '#section-members': 'Môn sinh',
  '#section-clubs': 'Điểm tập',
  '#section-contact': 'Liên hệ'
};

const formatNumber = (value: number) => new Intl.NumberFormat('vi-VN').format(value || 0);
const formatDateTime = (value: string) => value
  ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
  : '—';

const DeviceIcon = ({ device }: { device: AnalyticsVisitor['device'] }) => {
  if (device === 'mobile') return <Smartphone className="h-4 w-4" />;
  if (device === 'tablet') return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
};

export default function AdminAnalyticsPanel() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const loadAnalytics = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch('/api/analytics/summary', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Không tải được thống kê truy cập.');
      setData(payload as AnalyticsPayload);
      setError('');
      setLastLoadedAt(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không tải được thống kê truy cập.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics(true);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadAnalytics(false);
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [loadAnalytics]);

  const maxDailyViews = useMemo(
    () => Math.max(1, ...(data?.days || []).map(day => day.pageviews)),
    [data?.days]
  );

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <RefreshCw className="mx-auto h-7 w-7 animate-spin text-[#0054A6]" />
        <p className="mt-3 text-sm font-bold text-slate-600">Đang tổng hợp lượt truy cập...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-[#003b78] via-[#0054A6] to-[#0874cc] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#FFF200]">
              <Activity className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-[.16em]">Thống kê truy cập website</span>
            </div>
            <p className="mt-1 text-xs text-blue-100">Dữ liệu khách ẩn danh, không lưu IP đầy đủ, tên hay email.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadAnalytics(true)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-black hover:bg-white/20 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
        {error && (
          <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-xs font-bold text-rose-700">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard icon={Eye} label="Tổng lượt xem" value={data?.summary.totalPageviews || 0} color="blue" />
          <MetricCard icon={Users} label="Khách ẩn danh" value={data?.summary.totalVisitors || 0} color="indigo" />
          <MetricCard icon={TrendingUp} label="Tổng phiên" value={data?.summary.totalSessions || 0} color="amber" />
          <MetricCard icon={Activity} label="Đang hoạt động" value={data?.summary.activeVisitors || 0} color="emerald" />
          <MetricCard icon={Clock3} label="Hôm nay" value={data?.summary.today?.pageviews || 0} color="cyan" />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1.5fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2 border-b pb-3">
            <TrendingUp className="h-5 w-5 text-[#0054A6]" />
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800">14 ngày gần nhất</h3>
              <p className="text-[10px] text-slate-400">Chiều cao cột biểu thị lượt xem trang.</p>
            </div>
          </div>
          <div className="flex h-56 items-end gap-2 overflow-x-auto pb-2">
            {(data?.days || []).map(day => (
              <div key={day.date} className="group flex min-w-[30px] flex-1 flex-col items-center justify-end gap-2">
                <span className="text-[9px] font-black text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
                  {day.pageviews}
                </span>
                <div
                  className="w-full min-w-[18px] rounded-t-lg bg-gradient-to-t from-[#0054A6] to-cyan-400 shadow-sm transition-all group-hover:from-[#003b78] group-hover:to-[#FFF200]"
                  style={{ height: `${Math.max(5, (day.pageviews / maxDailyViews) * 155)}px` }}
                  title={`${day.date}: ${day.pageviews} lượt xem, ${day.visitors} khách`}
                />
                <span className="text-[9px] font-bold text-slate-400">{day.date.slice(5).replace('-', '/')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-[#0054A6]" />
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800">Khách truy cập gần đây</h3>
                <p className="text-[10px] text-slate-400">Mã khách là mã ẩn danh, không phải danh tính thật.</p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">
              Cập nhật: {lastLoadedAt ? lastLoadedAt.toLocaleTimeString('vi-VN') : '—'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2.5">Khách</th>
                  <th className="px-3 py-2.5">Thiết bị</th>
                  <th className="px-3 py-2.5">Đang xem</th>
                  <th className="px-3 py-2.5">Nguồn</th>
                  <th className="px-3 py-2.5">Lượt/Phiên</th>
                  <th className="px-3 py-2.5">Gần nhất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentVisitors || []).map(visitor => (
                  <tr key={visitor.visitorCode} className="hover:bg-blue-50/40">
                    <td className="px-3 py-3 font-mono font-black text-[#0054A6]">#{visitor.visitorCode}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        <DeviceIcon device={visitor.device} />
                        <span>{visitor.browser}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{visitor.os} · {visitor.language.toUpperCase()}</span>
                    </td>
                    <td className="px-3 py-3 font-bold text-slate-700">{sectionLabels[visitor.currentPath] || 'Giới thiệu'}</td>
                    <td className="px-3 py-3 text-slate-500">{visitor.referrerHost || 'trực tiếp'}</td>
                    <td className="px-3 py-3 font-bold text-slate-600">{formatNumber(visitor.totalPageviews)} / {formatNumber(visitor.totalSessions)}</td>
                    <td className="px-3 py-3 text-slate-500">{formatDateTime(visitor.lastSeenAt)}</td>
                  </tr>
                ))}
                {!data?.recentVisitors?.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-sm font-semibold text-slate-400">
                      Chưa có lượt truy cập mới được ghi nhận.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] text-emerald-800">
        Thống kê dùng <strong>{data?.storage === 'firebase' ? 'Firebase Firestore' : 'bộ nhớ Local khi chạy thử'}</strong>.
        Dữ liệu nội dung và thống kê nằm ở collection riêng nên không ghi đè bài viết, thành tích hoặc cấu hình web.
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'blue' | 'indigo' | 'amber' | 'emerald' | 'cyan';
}) {
  const colors = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    cyan: 'border-cyan-100 bg-cyan-50 text-cyan-700'
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-wide opacity-75">{label}</span>
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 text-2xl font-black">{formatNumber(value)}</div>
    </div>
  );
}
