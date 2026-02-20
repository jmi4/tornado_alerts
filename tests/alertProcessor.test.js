import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateCalmMessage, filterTornadoWarnings } from '../src/alertProcessor.js';

/**
 * Builds a minimal AlertFeature fixture for testing.
 * @param {Partial<import('../src/alertProcessor.js').AlertProperties>} overrides
 * @returns {import('../src/alertProcessor.js').AlertFeature}
 */
function makeAlert(overrides = {}) {
  return {
    id: 'urn:oid:2.49.0.1.840.0.test',
    properties: {
      event: 'Tornado Warning',
      areaDesc: 'Jefferson County, KY',
      effective: '2025-02-01T12:00:00-05:00',
      expires: '2025-02-01T13:00:00-05:00',
      severity: 'Extreme',
      headline: 'Tornado Warning issued for Jefferson County',
      description: 'A tornado has been confirmed by radar.',
      ...overrides,
    },
  };
}

describe('generateCalmMessage', () => {
  test('should include the area description in the message', () => {
    const alert = makeAlert({ areaDesc: 'Jefferson County, KY' });
    const message = generateCalmMessage(alert);
    assert.ok(message.includes('Jefferson County, KY'), 'Message should include the affected area');
  });

  test('should fall back to "your area" when areaDesc is null', () => {
    const alert = makeAlert({ areaDesc: null });
    const message = generateCalmMessage(alert);
    assert.ok(message.includes('your area'), 'Should use fallback area when areaDesc is missing');
  });

  test('should contain reassuring, calm language', () => {
    const alert = makeAlert();
    const message = generateCalmMessage(alert);
    const lower = message.toLowerCase();
    assert.ok(
      lower.includes('calm') || lower.includes('safe') || lower.includes('gentle'),
      'Message should contain reassuring language'
    );
  });

  test('should mention "until further notice" when expires is null', () => {
    const alert = makeAlert({ expires: null });
    const message = generateCalmMessage(alert);
    assert.ok(
      message.includes('until further notice'),
      'Should fall back to "until further notice" when no expiry is set'
    );
  });

  test('should not be empty', () => {
    const alert = makeAlert();
    const message = generateCalmMessage(alert);
    assert.ok(message.length > 0, 'Message must not be empty');
  });
});

describe('filterTornadoWarnings', () => {
  test('should only return Tornado Warning events', () => {
    const features = [
      makeAlert({ event: 'Tornado Warning' }),
      { properties: { event: 'Severe Thunderstorm Warning' } },
      { properties: { event: 'Tornado Watch' } },
      makeAlert({ event: 'Tornado Warning' }),
    ];
    const result = filterTornadoWarnings(features);
    assert.equal(result.length, 2);
    assert.ok(result.every((f) => f.properties.event === 'Tornado Warning'));
  });

  test('should return an empty array when there are no Tornado Warnings', () => {
    const features = [
      { properties: { event: 'Flash Flood Warning' } },
      { properties: { event: 'Severe Thunderstorm Watch' } },
    ];
    const result = filterTornadoWarnings(features);
    assert.equal(result.length, 0);
  });

  test('should handle an empty input array', () => {
    const result = filterTornadoWarnings([]);
    assert.equal(result.length, 0);
  });

  test('should handle features with missing properties gracefully', () => {
    const features = [{ properties: null }, { properties: undefined }, makeAlert()];
    const result = filterTornadoWarnings(features);
    assert.equal(result.length, 1);
  });
});
