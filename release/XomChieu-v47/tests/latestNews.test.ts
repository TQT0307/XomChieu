import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareLatestNewsByExpiry,
  getLatestNewsDurationMs,
  getLatestNewsRemainingMs,
  isArticleInLatestNews,
  LATEST_NEWS_DURATION_MS,
  normalizeLatestNewsDays
} from '../src/utils/latestNews';
import type { Article } from '../src/types';

const article = (overrides: Partial<Article> = {}): Article => ({
  id: 1,
  image: '',
  title: 'Tin mới',
  categoryId: 'news',
  content: '',
  date: '2026-07-01',
  views: 0,
  status: true,
  showInNews: true,
  ...overrides
});

test('latest news stays visible for exactly three days from promotion time', () => {
  const start = Date.parse('2026-07-28T10:00:00+07:00');
  const item = article({ featuredAt: new Date(start).toISOString() });

  assert.equal(
    getLatestNewsRemainingMs(item, start + 1000),
    LATEST_NEWS_DURATION_MS - 1000
  );
  assert.equal(isArticleInLatestNews(item, start + LATEST_NEWS_DURATION_MS - 1), true);
  assert.equal(isArticleInLatestNews(item, start + LATEST_NEWS_DURATION_MS), false);
});

test('each article can use its own latest-news duration', () => {
  const start = Date.parse('2026-07-28T10:00:00+07:00');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const item = article({
    featuredAt: new Date(start).toISOString(),
    featuredDays: 7
  });

  assert.equal(getLatestNewsDurationMs(item), sevenDays);
  assert.equal(isArticleInLatestNews(item, start + sevenDays - 1), true);
  assert.equal(isArticleInLatestNews(item, start + sevenDays), false);
});

test('latest-news day input is normalized to a safe range', () => {
  assert.equal(normalizeLatestNewsDays(undefined), 3);
  assert.equal(normalizeLatestNewsDays(0), 1);
  assert.equal(normalizeLatestNewsDays(8.6), 9);
  assert.equal(normalizeLatestNewsDays(999), 365);
});

test('unchecked articles never appear in latest news', () => {
  const start = Date.parse('2026-07-28T10:00:00+07:00');
  const item = article({
    showInNews: false,
    featuredAt: new Date(start).toISOString()
  });

  assert.equal(isArticleInLatestNews(item, start + 1000), false);
});

test('legacy articles without featuredAt use their publication date', () => {
  const item = article({ date: '2026-07-28', featuredAt: undefined });
  const withinThreeDays = Date.parse('2026-07-30T12:00:00+07:00');

  assert.equal(isArticleInLatestNews(item, withinThreeDays), true);
});

test('latest news with less remaining time is ordered first', () => {
  const earlier = article({
    id: 'earlier',
    featuredAt: '2026-07-28T01:00:00.000Z'
  });
  const later = article({
    id: 'later',
    featuredAt: '2026-07-28T05:00:00.000Z'
  });

  assert.deepEqual(
    [later, earlier].sort(compareLatestNewsByExpiry).map(item => item.id),
    ['earlier', 'later']
  );
});
