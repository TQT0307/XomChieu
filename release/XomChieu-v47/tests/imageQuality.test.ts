import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getHighQualityCropOutputSize,
  getRecommendedMaxZoom
} from '../src/utils/imageQuality';

test('large landscape images export at Full HD for a 16:9 frame', () => {
  assert.deepEqual(
    getHighQualityCropOutputSize(4000, 3000, '16:9', 100, 0),
    { width: 1920, height: 1080 }
  );
});

test('small source images are never enlarged beyond their real crop pixels', () => {
  assert.deepEqual(
    getHighQualityCropOutputSize(800, 600, '16:9', 100, 0),
    { width: 800, height: 450 }
  );
});

test('zoom uses real source pixels instead of exporting a fake fixed size', () => {
  assert.deepEqual(
    getHighQualityCropOutputSize(1600, 1200, '16:9', 200, 0),
    { width: 800, height: 450 }
  );
});

test('recommended zoom protects Full HD images from excessive upscaling', () => {
  assert.equal(getRecommendedMaxZoom(1920, 1080, '16:9', 0), 150);
  assert.equal(getRecommendedMaxZoom(800, 600, '16:9', 0), 100);
});

