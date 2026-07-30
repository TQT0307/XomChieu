const warmedImageUrls = new Set<string>();

const normalizeImageUrl = (value: unknown) => {
  const url = String(value || '').trim();
  return url && !url.startsWith('data:') ? url : '';
};

const loadImage = (url: string) => new Promise<void>(resolve => {
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => resolve();
  image.onerror = () => resolve();
  image.src = url;
});

export const warmImageCache = async (values: unknown[], concurrency = 4) => {
  const urls = Array.from(new Set(values.map(normalizeImageUrl).filter(Boolean)))
    .filter(url => !warmedImageUrls.has(url));
  urls.forEach(url => warmedImageUrls.add(url));
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < urls.length) {
      const url = urls[nextIndex++];
      await loadImage(url);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
};