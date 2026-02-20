import { describe, it, expect } from 'vitest';
import { filterTornadoWarnings, generateCalmMessage } from '../src/alertProcessor.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

const makeFeature = (event, id = 'urn:test:1', areaDesc = 'Jefferson County, KY') => ({
  id,
  properties: { event, areaDesc, expires: '2026-05-15T20:00:00Z', headline: `${event} issued` },
});

// ── filterTornadoWarnings ────────────────────────────────────────────────────

describe('filterTornadoWarnings', () => {
  it('returns empty array when given no features', () => {
    expect(filterTornadoWarnings([])).toEqual([]);
  });

  it('keeps Tornado Warning events', () => {
    const features = [makeFeature('Tornado Warning')];
    expect(filterTornadoWarnings(features)).toHaveLength(1);
  });

  it('filters out Tornado Watch events', () => {
    expect(filterTornadoWarnings([makeFeature('Tornado Watch')])).toHaveLength(0);
  });

  it('filters out Severe Thunderstorm Warning events', () => {
    expect(
      filterTornadoWarnings([makeFeature('Severe Thunderstorm Warning')])
    ).toHaveLength(0);
  });

  it('filters out Flash Flood Warning events', () => {
    expect(filterTornadoWarnings([makeFeature('Flash Flood Warning')])).toHaveLength(0);
  });

  it('filters out Severe Thunderstorm Watch events', () => {
    expect(
      filterTornadoWarnings([makeFeature('Severe Thunderstorm Watch')])
    ).toHaveLength(0);
  });

  it('returns only Tornado Warnings from a mixed list', () => {
    const features = [
      makeFeature('Tornado Warning', 'id1'),
      makeFeature('Tornado Watch', 'id2'),
      makeFeature('Severe Thunderstorm Warning', 'id3'),
      makeFeature('Tornado Warning', 'id4'),
      makeFeature('Flash Flood Warning', 'id5'),
    ];
    const result = filterTornadoWarnings(features);
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.id)).toEqual(['id1', 'id4']);
  });

  it('handles features with missing properties without throwing', () => {
    const malformed = [{ id: 'a' }, { id: 'b', properties: null }, { id: 'c' }];
    expect(() => filterTornadoWarnings(malformed)).not.toThrow();
    expect(filterTornadoWarnings(malformed)).toHaveLength(0);
  });

  it('preserves the original feature objects in the result', () => {
    const feature = makeFeature('Tornado Warning', 'id1');
    const result = filterTornadoWarnings([feature]);
    expect(result[0]).toBe(feature);
  });
});

// ── generateCalmMessage ──────────────────────────────────────────────────────

describe('generateCalmMessage', () => {
  const alert = makeFeature('Tornado Warning', 'id1', 'Jefferson County, KY');

  it('returns a non-empty string', () => {
    const msg = generateCalmMessage(alert);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(20);
  });

  it('includes the affected area in the message', () => {
    const msg = generateCalmMessage(alert);
    expect(msg).toContain('Jefferson County, KY');
  });

  it('does not contain alarming or panic-inducing language', () => {
    const msg = generateCalmMessage(alert).toLowerCase();
    // These words would be appropriate in a siren-style alert, not a calm one
    expect(msg).not.toMatch(/\b(emergency|critical|evacuate|run|flee|danger|imminent death)\b/);
  });

  it('contains calm, reassuring language', () => {
    const msg = generateCalmMessage(alert).toLowerCase();
    expect(msg).toMatch(/calm|safe|gentle|easy|take care/);
  });

  it('falls back gracefully when areaDesc is missing', () => {
    const noArea = { id: 'id1', properties: { event: 'Tornado Warning', expires: '2026-05-15T20:00:00Z' } };
    expect(() => generateCalmMessage(noArea)).not.toThrow();
    const msg = generateCalmMessage(noArea);
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(10);
  });

  it('falls back gracefully when expires is missing', () => {
    const noExpires = {
      id: 'id1',
      properties: { event: 'Tornado Warning', areaDesc: 'Test County, KY' },
    };
    expect(() => generateCalmMessage(noExpires)).not.toThrow();
    const msg = generateCalmMessage(noExpires);
    expect(msg).toContain('Test County, KY');
  });

  it('includes fallback expiry text when expires is not provided', () => {
    const noExpires = {
      id: 'id1',
      properties: { event: 'Tornado Warning', areaDesc: 'Some County' },
    };
    const msg = generateCalmMessage(noExpires);
    // Should handle the missing expiry without crashing and include some time reference
    expect(msg).toMatch(/until|notice|time/i);
  });

  it('generates different messages for different areas', () => {
    const alertA = makeFeature('Tornado Warning', 'id1', 'Jefferson County, KY');
    const alertB = makeFeature('Tornado Warning', 'id2', 'Hamilton County, OH');
    expect(generateCalmMessage(alertA)).not.toEqual(generateCalmMessage(alertB));
  });
});
