export type HighlightMediaKind = 'image' | 'video';

export const MAX_HIGHLIGHT_IMAGES = 20;
export const MAX_HIGHLIGHT_VIDEOS = 3;
export const MAX_HIGHLIGHT_VIDEO_SECONDS = 30;
export const MAX_HIGHLIGHT_VIDEO_BYTES = 3 * 1024 * 1024;
export const MAX_HIGHLIGHT_VIDEO_MB = 3;
export const RECOMMENDED_DIRECT_VIDEO_MB = 25;

const normalizeMediaUrl = (value: unknown) => String(value || '').trim();

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

export const getHighlightMediaKind = (value: unknown): HighlightMediaKind =>
  isYouTubeUrl(value) || isDirectVideoUrl(value) ? 'video' : 'image';

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
