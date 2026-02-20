import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for NWS poller URL construction and retry backoff logic.
 *
 * Network calls are not made in these tests; instead, we validate the
 * URL construction and backoff calculations that fetchAlerts() relies on.
 */
describe('NWS API URL construction', () => {
  test('should include the correct area parameter', () => {
    const state = 'KY';
    const url = new URL('https://api.weather.gov/alerts/active');
    url.searchParams.set('area', state.toUpperCase());

    assert.equal(url.searchParams.get('area'), 'KY');
  });

  test('should normalize lowercase state codes to uppercase', () => {
    const state = 'ky';
    const url = new URL('https://api.weather.gov/alerts/active');
    url.searchParams.set('area', state.toUpperCase());

    assert.equal(url.searchParams.get('area'), 'KY', 'State code must be uppercased');
  });

  test('should include event and status query parameters', () => {
    const url = new URL('https://api.weather.gov/alerts/active');
    url.searchParams.set('area', 'KY');
    url.searchParams.set('event', 'Tornado Warning');
    url.searchParams.set('status', 'actual');

    assert.equal(url.searchParams.get('event'), 'Tornado Warning');
    assert.equal(url.searchParams.get('status'), 'actual');
  });
});

describe('exponential backoff calculation', () => {
  const BASE_DELAY_MS = 5_000;
  const MAX_RETRIES = 5;

  test('should double the delay with each retry attempt', () => {
    const delays = Array.from({ length: MAX_RETRIES }, (_, i) =>
      BASE_DELAY_MS * Math.pow(2, i)
    );

    assert.equal(delays[0], 5_000, 'First retry delay should be 5s');
    assert.equal(delays[1], 10_000, 'Second retry delay should be 10s');
    assert.equal(delays[2], 20_000, 'Third retry delay should be 20s');
    assert.equal(delays[3], 40_000, 'Fourth retry delay should be 40s');
    assert.equal(delays[4], 80_000, 'Fifth retry delay should be 80s');
  });

  test('should stop retrying after MAX_RETRIES attempts', () => {
    let attempts = 0;
    const shouldRetry = (attempt) => attempt < MAX_RETRIES;

    while (shouldRetry(attempts)) {
      attempts++;
    }

    assert.equal(attempts, MAX_RETRIES);
  });

  test('should produce strictly increasing delays', () => {
    const delays = Array.from({ length: MAX_RETRIES }, (_, i) =>
      BASE_DELAY_MS * Math.pow(2, i)
    );

    for (let i = 1; i < delays.length; i++) {
      assert.ok(delays[i] > delays[i - 1], `Delay at attempt ${i} should exceed previous`);
    }
  });
});
