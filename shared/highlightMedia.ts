export type HighlightMediaKind = 'image' | 'video';
export type HighlightVideoProvider =
  | 'youtube'
  | 'tiktok'
  | 'vimeo'
  | 'dailymotion'
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'x'
  | 'direct';

export const MAX_HIGHLIGHT_IMAGES = 20;
export const MAX_HIGHLIGHT_VIDEOS = 3;
export const MAX_HIGHLIGHT_VIDEO_SECONDS = 30;
export const MAX_HIGHLIGHT_VIDEO_BYTES = 3 * 1024 * 1024;
export const MAX_HIGHLIGHT_VIDEO_MB = 3;
export const RECOMMENDED_DIRECT_VIDEO_MB = 25;

const normalizeMediaUrl = (value: unknown) => String(value || '').trim();

const getParsedMediaUrl = (value: unknown): URL | null => {
  const rawUrl = normalizeMediaUrl(value);
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
};

const normalizeHostname = (url: URL) => url.hostname.toLowerCase().replace(/^www\./, '');

const isHostname = (hostname: string, domain: string) =>
  hostname === domain || hostname.endsWith('.' + domain);

export const getYouTubeVideoId = (value: unknown): string | null => {
  const rawUrl = normalizeMediaUrl(value);
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (!['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(hostname)) return null;
    if (url.pathname === '/watch') return url.searchParams.get('v');
    const parts = url.pathname.split('/').filter(Boolean);
    if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1] || null;
  } catch {
    return null;
  }
  return null;
};

export const isYouTubeUrl = (value: unknown) => Boolean(getYouTubeVideoId(value));

export const getYouTubeEmbedUrl = (value: unknown): string | null => {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0` : null;
};

export const getYouTubeThumbnailUrl = (value: unknown): string | null => {
  const videoId = getYouTubeVideoId(value);
  return videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : null;
};

export const getTikTokVideoId = (value: unknown): string | null => {
  const rawUrl = normalizeMediaUrl(value);
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!['tiktok.com', 'm.tiktok.com', 'vm.tiktok.com'].includes(hostname)) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const videoIndex = parts.indexOf('video');
    const candidate = videoIndex >= 0 ? parts[videoIndex + 1] :
      (parts[0] === 'player' && parts[1] === 'v1' ? parts[2] : null);
    return candidate && /^\d+$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
};

export const isTikTokUrl = (value: unknown) => Boolean(getTikTokVideoId(value));

export const getTikTokEmbedUrl = (value: unknown): string | null => {
  const videoId = getTikTokVideoId(value);
  return videoId
    ? `https://www.tiktok.com/player/v1/${encodeURIComponent(videoId)}?controls=1&autoplay=0&rel=0`
    : null;
};
export const getVimeoVideoId = (value: unknown): string | null => {
  const url = getParsedMediaUrl(value);
  if (!url) return null;
  const hostname = normalizeHostname(url);
  if (!isHostname(hostname, 'vimeo.com')) return null;
  const candidate = url.pathname.split('/').filter(Boolean).find(part => /^\d+$/.test(part));
  return candidate || null;
};

export const isVimeoUrl = (value: unknown) => Boolean(getVimeoVideoId(value));

export const getVimeoEmbedUrl = (value: unknown): string | null => {
  const videoId = getVimeoVideoId(value);
  return videoId
    ? 'https://player.vimeo.com/video/' + encodeURIComponent(videoId) + '?dnt=1&autoplay=0'
    : null;
};

export const getDailymotionVideoId = (value: unknown): string | null => {
  const url = getParsedMediaUrl(value);
  if (!url) return null;
  const hostname = normalizeHostname(url);
  const parts = url.pathname.split('/').filter(Boolean);
  const candidate = hostname === 'dai.ly'
    ? parts[0]
    : (isHostname(hostname, 'dailymotion.com') && parts[0] === 'video' ? parts[1] : null);
  return candidate && /^[a-zA-Z0-9]+$/.test(candidate) ? candidate : null;
};

export const isDailymotionUrl = (value: unknown) => Boolean(getDailymotionVideoId(value));

export const isFacebookVideoUrl = (value: unknown): boolean => {
  const url = getParsedMediaUrl(value);
  if (!url) return false;
  const hostname = normalizeHostname(url);
  if (hostname === 'fb.watch') return true;
  if (!isHostname(hostname, 'facebook.com')) return false;
  return /\/(?:watch|reel|reels|videos)(?:\/|$)/i.test(url.pathname) || url.pathname === '/watch';
};

export const isInstagramVideoUrl = (value: unknown): boolean => {
  const url = getParsedMediaUrl(value);
  if (!url || !isHostname(normalizeHostname(url), 'instagram.com')) return false;
  return /^\/(?:p|reel|reels|tv)\/[^/]+/i.test(url.pathname);
};

export const isThreadsPostUrl = (value: unknown): boolean => {
  const url = getParsedMediaUrl(value);
  if (!url) return false;
  const hostname = normalizeHostname(url);
  if (!isHostname(hostname, 'threads.net') && !isHostname(hostname, 'threads.com')) return false;
  return /^\/@[^/]+\/post\/[^/]+/i.test(url.pathname);
};

export const isXPostUrl = (value: unknown): boolean => {
  const url = getParsedMediaUrl(value);
  if (!url) return false;
  const hostname = normalizeHostname(url);
  if (!isHostname(hostname, 'x.com') && !isHostname(hostname, 'twitter.com')) return false;
  return /^\/[^/]+\/status\/\d+/i.test(url.pathname);
};

export const isDirectVideoUrl = (value: unknown): boolean => {
  const rawUrl = normalizeMediaUrl(value);
  if (!rawUrl) return false;
  if (/^data:video\//i.test(rawUrl)) return true;
  try {
    return /\.(mp4|webm|ogg|mov|m4v)$/.test(new URL(rawUrl).pathname.toLowerCase());
  } catch {
    return /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i.test(rawUrl);
  }
};

export const getHighlightVideoProvider = (value: unknown): HighlightVideoProvider | null => {
  if (isYouTubeUrl(value)) return 'youtube';
  if (isTikTokUrl(value)) return 'tiktok';
  if (isVimeoUrl(value)) return 'vimeo';
  if (isDailymotionUrl(value)) return 'dailymotion';
  if (isFacebookVideoUrl(value)) return 'facebook';
  if (isInstagramVideoUrl(value)) return 'instagram';
  if (isThreadsPostUrl(value)) return 'threads';
  if (isXPostUrl(value)) return 'x';
  if (isDirectVideoUrl(value)) return 'direct';
  return null;
};

export const getHighlightVideoEmbedUrl = (value: unknown): string | null =>
  getYouTubeEmbedUrl(value) || getTikTokEmbedUrl(value) || getVimeoEmbedUrl(value);

export const getHighlightVideoProviderLabel = (value: unknown): string => {
  const provider = getHighlightVideoProvider(value);
  return provider === 'youtube' ? 'YouTube' :
    provider === 'tiktok' ? 'TikTok' :
    provider === 'vimeo' ? 'Vimeo' :
    provider === 'dailymotion' ? 'Dailymotion' :
    provider === 'facebook' ? 'Facebook' :
    provider === 'instagram' ? 'Instagram' :
    provider === 'threads' ? 'Threads' :
    provider === 'x' ? 'X' :
    'video';
};

export const getHighlightMediaKind = (value: unknown): HighlightMediaKind =>
  getHighlightVideoProvider(value) ? 'video' : 'image';

export const getHighlightMediaCounts = (mediaUrls: unknown) => {
  const urls = Array.isArray(mediaUrls) ? mediaUrls.map(normalizeMediaUrl).filter(Boolean) : [];
  const videos = urls.filter(url => getHighlightMediaKind(url) === 'video').length;
  return { images: urls.length - videos, videos, total: urls.length };
};

export const validateHighlightMediaUrls = (mediaUrls: unknown): string | null => {
  if (!Array.isArray(mediaUrls)) return 'Danh sách ảnh/clip không hợp lệ.';
  if (mediaUrls.some(url => typeof url !== 'string')) return 'Đường dẫn ảnh/clip không hợp lệ.';
  if (mediaUrls.some(url => /^data:video\//i.test(String(url).trim()))) {
    return 'Không lưu video dạng nhúng base64. Hãy dùng liên kết YouTube hoặc MP4/WebM.';
  }
  const counts = getHighlightMediaCounts(mediaUrls);
  if (counts.images > MAX_HIGHLIGHT_IMAGES) return `Mỗi bài được đăng tối đa ${MAX_HIGHLIGHT_IMAGES} ảnh.`;
  if (counts.videos > MAX_HIGHLIGHT_VIDEOS) return `Mỗi bài được đăng tối đa ${MAX_HIGHLIGHT_VIDEOS} clip.`;
  return null;
};
