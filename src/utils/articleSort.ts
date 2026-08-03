import type { Article } from '../types';

export const getArticleDateTimestamp = (dateValue?: string): number => {
  const value = String(dateValue || '').trim();
  if (!value) return 0;

  const yearFirst = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (yearFirst) {
    return Date.UTC(Number(yearFirst[1]), Number(yearFirst[2]) - 1, Number(yearFirst[3]));
  }

  const dayFirst = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dayFirst) {
    return Date.UTC(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1]));
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const compareArticlesNewestFirst = (a: Article, b: Article): number =>
  getArticleDateTimestamp(b.date) - getArticleDateTimestamp(a.date);