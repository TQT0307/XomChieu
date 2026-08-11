import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiSource = fs.readFileSync(path.join(root, 'api', 'index.ts'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
const adminSource = fs.readFileSync(path.join(root, 'src', 'components', 'AdminPanel.tsx'), 'utf8');
const trackerSource = fs.readFileSync(path.join(root, 'src', 'utils', 'visitorAnalytics.ts'), 'utf8');

test('visitor tracking is isolated, rate limited and does not store raw IP addresses', () => {
  assert.match(apiSource, /ANALYTICS_COLLECTION = "vovinam_analytics"/);
  assert.match(apiSource, /ANALYTICS_RATE_LIMIT_MS/);
  assert.match(apiSource, /analyticsVisitorHash\(visitorId\)/);
  assert.doesNotMatch(apiSource, /AnalyticsVisitorRecord[\s\S]{0,500}\bip(Address)?\b/i);
});

test('analytics summary is protected by the Super Admin session', () => {
  assert.match(apiSource, /"\/api\/analytics\/summary",\s*requireAdminSession,\s*requireSuperAdmin/);
});

test('public analytics loads after the application and uses a five minute heartbeat', () => {
  assert.match(appSource, /import\('\.\/utils\/visitorAnalytics'\)/);
  assert.match(trackerSource, /HEARTBEAT_INTERVAL_MS = 5 \* 60 \* 1000/);
  assert.match(trackerSource, /keepalive: true/);
  assert.match(trackerSource, /Analytics is intentionally best-effort/);
});

test('analytics UI is lazy and only available in the privileged Admin area', () => {
  assert.match(adminSource, /React\.lazy\(\(\) => import\('\.\/AdminAnalyticsPanel'\)\)/);
  assert.match(adminSource, /activeTab === 'analytics' && currentAdmin\?\.role === 'super'/);
});
