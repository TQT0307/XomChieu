import type { Article } from '../types';

export const LATEST_NEWS_DURATION_MS = 3 * 24 * 60 * 60 * 1000;

const parseDateMs = (value?: string): number | null => {
  const text = String(value || '').trim();
  if (!text) return null;
  const timestamp = Date.parse(
    /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text
  );
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const getLatestNewsStartMs = (article: Article): number | null =>
  parseDateMs(article.featuredAt) ?? parseDateMs(article.date);

export const getLatestNewsExpiryMs = (article: Article): number | null => {
  const startMs = getLatestNewsStartMs(article);
  return startMs === null ? null : startMs + LATEST_NEWS_DURATION_MS;
};

export const getLatestNewsRemainingMs = (
  article: Article,
  nowMs = Date.now()
): number => {
  if (!article.showInNews) return 0;
  const startMs = getLatestNewsStartMs(article);
  if (startMs === null || startMs > nowMs) return 0;
  return Math.max(0, startMs + LATEST_NEWS_DURATION_MS - nowMs);
};

export const isArticleInLatestNews = (
  article: Article,
  nowMs = Date.now()
): boolean => getLatestNewsRemainingMs(article, nowMs) > 0;

