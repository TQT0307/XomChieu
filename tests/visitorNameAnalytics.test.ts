import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiSource = fs.readFileSync(path.join(root, 'api', 'index.ts'), 'utf8');
const analyticsPanelSource = fs.readFileSync(path.join(root, 'src', 'components', 'AdminAnalyticsPanel.tsx'), 'utf8');
const trackerSource = fs.readFileSync(path.join(root, 'src', 'utils', 'visitorAnalytics.ts'), 'utf8');

test('analytics records recent named visitor activity with timestamps', () => {
  assert.match(apiSource, /recentActivities: mergeAnalyticsActivities/);
  assert.match(apiSource, /currentSessionStartedAt/);
  assert.match(trackerSource, /vovinam:section-view/);
  assert.match(analyticsPanelSource, /visitor\.recentActivities/);
  assert.match(analyticsPanelSource, /formatSessionDuration/);
});

test('analytics name remains optional and excludes private identity fields', () => {
  assert.match(apiSource, /normalizeAnalyticsVisitorName/);
  assert.doesNotMatch(apiSource, /type AnalyticsTrackPayload[\s\S]{0,1000}\b(email|avatar|displayName|fullName)\b/);
  assert.match(analyticsPanelSource, /Tên chỉ hiện khi khách tự nguyện nhập/);
});
