import type { Article } from '../types';

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_LATEST_NEWS_DAYS = 3;
export const MIN_LATEST_NEWS_DAYS = 1;
export const MAX_LATEST_NEWS_DAYS = 365;
export const LATEST_NEWS_DURATION_MS = DEFAULT_LATEST_NEWS_DAYS * DAY_MS;

export const normalizeLatestNewsDays = (value: unknown): number => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return DEFAULT_LATEST_NEWS_DAYS;
  return Math.min(
    MAX_LATEST_NEWS_DAYS,
    Math.max(MIN_LATEST_NEWS_DAYS, Math.round(numericValue))
  );
};

export const getLatestNewsDurationMs = (article: Article): number =>
  normalizeLatestNewsDays(article.featuredDays) * DAY_MS;

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
  return startMs === null ? null : startMs + getLatestNewsDurationMs(article);
};

export const getLatestNewsRemainingMs = (
  article: Article,
  nowMs = Date.now()
): number => {
  if (!article.showInNews) return 0;
  const startMs = getLatestNewsStartMs(article);
  if (startMs === null || startMs > nowMs) return 0;
  return Math.max(0, startMs + getLatestNewsDurationMs(article) - nowMs);
};

export const isArticleInLatestNews = (
  article: Article,
  nowMs = Date.now()
): boolean => getLatestNewsRemainingMs(article, nowMs) > 0;

export const compareLatestNewsByExpiry = (
  left: Article,
  right: Article
): number => {
  const leftExpiry = getLatestNewsExpiryMs(left) ?? Number.MAX_SAFE_INTEGER;
  const rightExpiry = getLatestNewsExpiryMs(right) ?? Number.MAX_SAFE_INTEGER;
  return leftExpiry - rightExpiry;
};
