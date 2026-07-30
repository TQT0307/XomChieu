import assert from 'node:assert/strict';
import test from 'node:test';
import { buildGoogleMapsEmbedUrl } from '../src/utils/googleMaps';

test('uses the real place marker as the exact map center instead of the shifted viewport', () => {
  const url = buildGoogleMapsEmbedUrl(
    'https://www.google.com/maps/place/Test/@10.700,106.690,17z/data=!3d10.756!4d106.704',
    'fallback'
  );
  assert.match(url, /ll=10\.756%2C106\.704/);
  assert.doesNotMatch(url, /10\.700/);
  assert.doesNotMatch(url, /[?&]q=/);
});

test('normalizes an exact embed URL to a centered map background', () => {
  const url = buildGoogleMapsEmbedUrl(
    '<iframe src="https://www.google.com/maps/embed?pb=!1m1!3d10.762!4d106.701"></iframe>',
    'fallback'
  );
  assert.match(url, /ll=10\.762%2C106\.701/);
  assert.doesNotMatch(url, /[?&]q=/);
});

test('preserves exact center coordinates when a generated URL is loaded again', () => {
  const firstUrl = buildGoogleMapsEmbedUrl(
    'https://www.google.com/maps/place/Test/@10.700,106.690,17z/data=!3d10.756!4d106.704',
    'old fallback'
  );
  const secondUrl = buildGoogleMapsEmbedUrl(firstUrl, 'a changed fallback');
  assert.match(secondUrl, /ll=10\.756%2C106\.704/);
  assert.doesNotMatch(secondUrl, /[?&]q=/);
});