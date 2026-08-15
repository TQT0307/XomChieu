import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiSource = fs.readFileSync(path.join(root, 'api', 'index.ts'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src', 'App.tsx'), 'utf8');
const adminSource = fs.readFileSync(path.join(root, 'src', 'components', 'AdminPanel.tsx'), 'utf8');
const analyticsPanelSource = fs.readFileSync(path.join(root, 'src', 'components', 'AdminAnalyticsPanel.tsx'), 'utf8');
const trackerSource = fs.readFileSync(path.join(root, 'src', 'utils', 'visitorAnalytics.ts'), 'utf8');
const visitorPromptSource = fs.readFileSync(path.join(root, 'src', 'components', 'VisitorNamePrompt.tsx'), 'utf8');

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
  assert.match(appSource, /import \{ startVisitorAnalytics \} from '\.\/utils\/visitorAnalytics'/);
  assert.match(appSource, /setTimeout\(\(\) => \{[\s\S]*startVisitorAnalytics\(\)[\s\S]*\}, 1200\)/);
  assert.match(trackerSource, /HEARTBEAT_INTERVAL_MS = 5 \* 60 \* 1000/);
  assert.match(trackerSource, /keepalive: true/);
  assert.match(trackerSource, /Analytics is intentionally best-effort/);
});

test('analytics UI is lazy and only available in the privileged Admin area', () => {
  assert.match(adminSource, /React\.lazy\(\(\) => import\('\.\/AdminAnalyticsPanel'\)\)/);
  assert.match(adminSource, /activeTab === 'analytics' && currentAdmin\?\.role === 'super'/);
});
test('authenticated Admin visits are excluded before analytics storage', () => {
  assert.match(apiSource, /if \(readAdminSession\(req\)\) return res\.status\(202\)\.json\(\{ accepted: true, ignored: "admin" \}\)/);
  assert.match(appSource, /if \(isAdmin\) return;/);
  assert.match(trackerSource, /window\.location\.hash\.startsWith\('#admin'\)/);
});

test('mandatory visitor name never collects email, avatar or full IP identity', () => {
  assert.doesNotMatch(apiSource, /type AnalyticsTrackPayload[\s\S]{0,1000}\b(email|avatar|displayName|fullName)\b/);
  assert.match(apiSource, /normalizeAnalyticsVisitorName/);
  assert.match(visitorPromptSource, /Vui lòng nhập tên để tiếp tục xem website/);
  assert.match(visitorPromptSource, /required/);
  assert.doesNotMatch(visitorPromptSource, /Bỏ qua|skipPrompt|onMouseDown/);
});

test('visitor name prompt opens after scrolling and remembers the decision', () => {
  assert.match(visitorPromptSource, /PROMPT_SCROLL_THRESHOLD = 24/);
  assert.match(visitorPromptSource, /getStoredVisitorName/);
  assert.match(visitorPromptSource, /window\.addEventListener\('scroll'/);
  assert.match(visitorPromptSource, /document\.body\.style\.overflow = 'hidden'/);
  assert.match(visitorPromptSource, /identifyVisitor\(normalizedName\)/);
  assert.match(appSource, /adminSessionStatus/);
  assert.match(appSource, /fetch\('\/api\/admin-session'/);
});
test('analytics dates use day month year while chart labels use day month', () => {
  assert.match(analyticsPanelSource, /formatChartDate/);
  assert.match(analyticsPanelSource, /parts\.day/);
  assert.match(analyticsPanelSource, /parts\.year/);
});
test('admin analytics shows each visitor visit count explicitly', () => {
  assert.match(analyticsPanelSource, /Lần truy cập/);
  assert.match(analyticsPanelSource, /visitor\.totalSessions/);
  assert.match(analyticsPanelSource, /visitor\.totalPageviews/);
});

test('analytics keeps recent viewed sections and paginates visitors by fifteen rows', () => {
  assert.match(apiSource, /viewedPaths: mergeAnalyticsViewedPaths/);
  assert.match(apiSource, /slice\(-12\)/);
  assert.match(analyticsPanelSource, /const VISITOR_PAGE_SIZE = 15/);
  assert.match(analyticsPanelSource, /const ACTIVE_VISITOR_WINDOW_MS = 15 \* 60 \* 1000/);
  assert.match(analyticsPanelSource, /pagedVisitors\.map/);
  assert.match(analyticsPanelSource, /visitor\.viewedPaths/);
  assert.match(analyticsPanelSource, /className="space-y-6"/);
  assert.match(analyticsPanelSource, /repeat\(14,minmax\(34px,1fr\)\)/);
});
