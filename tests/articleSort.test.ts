import test from 'node:test';
import assert from 'node:assert/strict';
import { compareArticlesNewestFirst, getArticleDateTimestamp } from '../src/utils/articleSort';
import type { Article } from '../src/types';

const article = (id: string, date: string): Article => ({
  id,
  date,
  title: id,
  image: '',
  categoryId: 'news',
  content: '',
  views: 0,
  status: true
});

test('public articles are ordered from newest date to oldest date', () => {
  const items = [
    article('April', '2026-04-05'),
    article('July', '2026-07-24'),
    article('May', '2026-05-20'),
    article('June', '2026-06-25')
  ].sort(compareArticlesNewestFirst);
  assert.deepEqual(items.map(item => item.id), ['July', 'June', 'May', 'April']);
});

test('article date sorting supports both ISO and Vietnamese day-first formats', () => {
  assert.ok(getArticleDateTimestamp('24/07/2026') > getArticleDateTimestamp('2026-06-25'));
  assert.equal(getArticleDateTimestamp('không rõ ngày'), 0);
});