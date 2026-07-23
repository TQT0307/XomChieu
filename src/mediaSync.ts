const INLINE_IMAGE_PREFIX = 'data:image/';
const MAX_PARALLEL_UPLOADS = 3;

const collectInlineImages = (value: unknown, output: Set<string>) => {
  if (typeof value === 'string') {
    if (value.startsWith(INLINE_IMAGE_PREFIX)) output.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectInlineImages(item, output));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(item => collectInlineImages(item, output));
  }
};

const replaceInlineImages = (value: unknown, uploadedUrls: Map<string, string>): unknown => {
  if (typeof value === 'string') return uploadedUrls.get(value) || value;
  if (Array.isArray(value)) return value.map(item => replaceInlineImages(item, uploadedUrls));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, replaceInlineImages(item, uploadedUrls)])
    );
  }
  return value;
};

const uploadInlineImage = async (dataUrl: string) => {
  const response = await fetch('/api/media/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.url !== 'string') {
    throw new Error(result.error || result.message || 'Không thể lưu ảnh lên kho ảnh.');
  }
  return result.url as string;
};

/**
 * Moves inline base64 images out of the JSON database before a CRUD save.
 * This keeps Firestore documents, Redis payloads and localStorage small while
 * preserving the exact public URL returned by the media API.
 */
export async function externalizeInlineImages<T>(value: T): Promise<T> {
  const inlineImages = new Set<string>();
  collectInlineImages(value, inlineImages);
  if (inlineImages.size === 0) return value;

  const queue = Array.from(inlineImages);
  const uploadedUrls = new Map<string, string>();
  let cursor = 0;

  const worker = async () => {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;
      const dataUrl = queue[index];
      uploadedUrls.set(dataUrl, await uploadInlineImage(dataUrl));
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_PARALLEL_UPLOADS, queue.length) },
      () => worker()
    )
  );

  return replaceInlineImages(value, uploadedUrls) as T;
}
