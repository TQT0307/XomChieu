export type ImageQualityRatio = '1:1' | '16:9' | '4:3';

const RATIO_VALUES: Record<ImageQualityRatio, number> = {
  '1:1': 1,
  '16:9': 16 / 9,
  '4:3': 4 / 3
};

const MAX_OUTPUT: Record<ImageQualityRatio, { width: number; height: number }> = {
  '1:1': { width: 1600, height: 1600 },
  '16:9': { width: 1920, height: 1080 },
  '4:3': { width: 1800, height: 1350 }
};

const MIN_SHARP_OUTPUT: Record<ImageQualityRatio, { width: number; height: number }> = {
  '1:1': { width: 1200, height: 1200 },
  '16:9': { width: 1280, height: 720 },
  '4:3': { width: 1200, height: 900 }
};

const getCropPixels = (
  sourceWidth: number,
  sourceHeight: number,
  ratio: ImageQualityRatio,
  zoom: number,
  rotation: number
) => {
  const swapped = Math.abs(rotation % 180) === 90;
  const rotatedWidth = swapped ? sourceHeight : sourceWidth;
  const rotatedHeight = swapped ? sourceWidth : sourceHeight;
  const zoomScale = Math.max(1, zoom / 100);
  const availableWidth = Math.max(1, rotatedWidth / zoomScale);
  const availableHeight = Math.max(1, rotatedHeight / zoomScale);
  const targetRatio = RATIO_VALUES[ratio];

  if (availableWidth / availableHeight > targetRatio) {
    return {
      width: availableHeight * targetRatio,
      height: availableHeight
    };
  }
  return {
    width: availableWidth,
    height: availableWidth / targetRatio
  };
};

export const getHighQualityCropOutputSize = (
  sourceWidth: number,
  sourceHeight: number,
  ratio: ImageQualityRatio,
  zoom: number,
  rotation: number
) => {
  const crop = getCropPixels(sourceWidth, sourceHeight, ratio, zoom, rotation);
  const maximum = MAX_OUTPUT[ratio];
  const scale = Math.min(
    1,
    maximum.width / crop.width,
    maximum.height / crop.height
  );

  return {
    width: Math.max(1, Math.floor(crop.width * scale)),
    height: Math.max(1, Math.floor(crop.height * scale))
  };
};

export const getRecommendedMaxZoom = (
  sourceWidth: number,
  sourceHeight: number,
  ratio: ImageQualityRatio,
  rotation: number
) => {
  const cropAtDefaultZoom = getCropPixels(
    sourceWidth,
    sourceHeight,
    ratio,
    100,
    rotation
  );
  const minimum = MIN_SHARP_OUTPUT[ratio];
  const availableScale = Math.min(
    cropAtDefaultZoom.width / minimum.width,
    cropAtDefaultZoom.height / minimum.height
  );

  return Math.max(100, Math.min(300, Math.floor(availableScale * 100)));
};

