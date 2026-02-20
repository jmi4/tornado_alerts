import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fs BEFORE importing the module under test (vi.mock is hoisted automatically)
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import {
  loadSpokenAlerts,
  hasBeenSpoken,
  markAsSpoken,
  _reset,
} from '../src/deduplication.js';

describe('deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _reset(); // clear in-memory Set between tests
  });

  // ── hasBeenSpoken ──────────────────────────────────────────────────────────

  describe('hasBeenSpoken', () => {
    it('returns false for an unknown alert ID', () => {
      expect(hasBeenSpoken('urn:oid:2.49.0.1.840.0.TEST')).toBe(false);
    });

    it('returns true immediately after markAsSpoken', () => {
      markAsSpoken('urn:test:1');
      expect(hasBeenSpoken('urn:test:1')).toBe(true);
    });

    it('returns false for a different ID after marking another', () => {
      markAsSpoken('urn:test:1');
      expect(hasBeenSpoken('urn:test:2')).toBe(false);
    });

    it('returns true for multiple separately marked IDs', () => {
      markAsSpoken('urn:test:1');
      markAsSpoken('urn:test:2');
      markAsSpoken('urn:test:3');
      expect(hasBeenSpoken('urn:test:1')).toBe(true);
      expect(hasBeenSpoken('urn:test:2')).toBe(true);
      expect(hasBeenSpoken('urn:test:3')).toBe(true);
    });
  });

  // ── markAsSpoken ───────────────────────────────────────────────────────────

  describe('markAsSpoken', () => {
    it('persists the ID to disk via writeFileSync', () => {
      markAsSpoken('urn:test:1');
      expect(writeFileSync).toHaveBeenCalledOnce();
    });

    it('persists the correct ID in the JSON payload', () => {
      markAsSpoken('urn:test:1');
      const [, content] = vi.mocked(writeFileSync).mock.calls[0];
      const ids = JSON.parse(content);
      expect(ids).toContain('urn:test:1');
    });

    it('creates the parent directory before writing', () => {
      markAsSpoken('urn:test:1');
      expect(mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('does not add the same ID twice (Set semantics)', () => {
      markAsSpoken('urn:test:1');
      markAsSpoken('urn:test:1');
      // Last write should still contain exactly one entry for urn:test:1
      const [, content] = vi.mocked(writeFileSync).mock.calls.at(-1);
      const ids = JSON.parse(content);
      expect(ids.filter((id) => id === 'urn:test:1')).toHaveLength(1);
    });

    it('accumulates multiple distinct IDs in the persisted file', () => {
      markAsSpoken('urn:test:1');
      markAsSpoken('urn:test:2');
      const [, content] = vi.mocked(writeFileSync).mock.calls.at(-1);
      const ids = JSON.parse(content);
      expect(ids).toContain('urn:test:1');
      expect(ids).toContain('urn:test:2');
    });
  });

  // ── loadSpokenAlerts ───────────────────────────────────────────────────────

  describe('loadSpokenAlerts', () => {
    it('starts clean when the dedup file does not exist (ENOENT)', () => {
      vi.mocked(readFileSync).mockImplementation(() => {
        const err = new Error('ENOENT: no such file');
        err.code = 'ENOENT';
        throw err;
      });
      expect(() => loadSpokenAlerts()).not.toThrow();
      expect(hasBeenSpoken('any-id')).toBe(false);
    });

    it('loads IDs from the dedup file on startup', () => {
      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify(['urn:test:1', 'urn:test:2'])
      );
      loadSpokenAlerts();
      expect(hasBeenSpoken('urn:test:1')).toBe(true);
      expect(hasBeenSpoken('urn:test:2')).toBe(true);
    });

    it('does not mark unknown IDs as spoken after load', () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(['urn:test:1']));
      loadSpokenAlerts();
      expect(hasBeenSpoken('urn:test:99')).toBe(false);
    });

    it('recovers gracefully from corrupted JSON in the dedup file', () => {
      vi.mocked(readFileSync).mockReturnValue('not valid json{{{');
      expect(() => loadSpokenAlerts()).not.toThrow();
      expect(hasBeenSpoken('any-id')).toBe(false);
    });

    it('recovers gracefully from a dedup file containing a non-array', () => {
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ not: 'an array' }));
      // Should not crash; the Set may be initialized with the object (edge case handled gracefully)
      expect(() => loadSpokenAlerts()).not.toThrow();
    });
  });

  // ── JSON round-trip ────────────────────────────────────────────────────────

  describe('JSON round-trip', () => {
    it('marks → persists → reloads with same IDs present', () => {
      markAsSpoken('urn:test:1');
      markAsSpoken('urn:test:2');

      // Capture what was written
      const written = vi.mocked(writeFileSync).mock.calls.at(-1)[1];

      // Simulate a restart: reset in-memory state, then reload from "disk"
      _reset();
      vi.mocked(readFileSync).mockReturnValue(written);
      loadSpokenAlerts();

      expect(hasBeenSpoken('urn:test:1')).toBe(true);
      expect(hasBeenSpoken('urn:test:2')).toBe(true);
    });

    it('written JSON is a valid array of strings', () => {
      markAsSpoken('urn:test:abc');
      const [, content] = vi.mocked(writeFileSync).mock.calls.at(-1);
      const parsed = JSON.parse(content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.every((id) => typeof id === 'string')).toBe(true);
    });
  });
});
