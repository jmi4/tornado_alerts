import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

import { spawn } from 'child_process';
import { playAudio } from '../src/audioPlayer.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a mock child process that emits 'close' (or 'error') asynchronously
 * after all .on() handlers have been registered.
 */
function createMockProcess({ exitCode = 0, error = null } = {}) {
  const mockProc = {
    on: vi.fn((event, cb) => {
      if (event === 'close' && error === null) {
        // Emit after current synchronous execution finishes
        Promise.resolve().then(() => cb(exitCode));
      } else if (event === 'error' && error !== null) {
        Promise.resolve().then(() => cb(error));
      }
      return mockProc;
    }),
  };
  return mockProc;
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.AUDIO_PLAYER;
  delete process.env.VOLUME;
});

// ── mpg123 (default player) ───────────────────────────────────────────────────

describe('playAudio – mpg123 (default)', () => {
  beforeEach(() => {
    process.env.AUDIO_PLAYER = 'mpg123';
    process.env.VOLUME = '30';
  });

  it('spawns mpg123 by default', async () => {
    vi.mocked(spawn).mockReturnValue(createMockProcess());
    await playAudio('/path/to/audio.mp3');
    expect(spawn).toHaveBeenCalledWith('mpg123', expect.any(Array), expect.any(Object));
  });

  it('passes the file path as the last argument', async () => {
    vi.mocked(spawn).mockReturnValue(createMockProcess());
    await playAudio('/path/to/audio.mp3');
    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args.at(-1)).toBe('/path/to/audio.mp3');
  });

  it('passes the --volume flag with the configured volume', async () => {
    process.env.VOLUME = '45';
    vi.mocked(spawn).mockReturnValue(createMockProcess());
    await playAudio('/path/to/audio.mp3');
    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toContain('--volume');
    expect(args).toContain('45');
  });

  it('defaults to volume 30 when VOLUME is not set', async () => {
    delete process.env.VOLUME;
    vi.mocked(spawn).mockReturnValue(createMockProcess());
    await playAudio('/path/to/audio.mp3');
    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toContain('30');
  });

  it('resolves when mpg123 exits with code 0', async () => {
    vi.mocked(spawn).mockReturnValue(createMockProcess({ exitCode: 0 }));
    await expect(playAudio('/path/to/audio.mp3')).resolves.toBeUndefined();
  });

  it('still resolves (with a warning) when mpg123 exits with non-zero code', async () => {
    vi.mocked(spawn).mockReturnValue(createMockProcess({ exitCode: 1 }));
    await expect(playAudio('/path/to/audio.mp3')).resolves.toBeUndefined();
  });

  it('rejects when mpg123 emits an error event', async () => {
    const err = new Error('mpg123 not found');
    vi.mocked(spawn).mockReturnValue(createMockProcess({ error: err }));
    await expect(playAudio('/path/to/audio.mp3')).rejects.toThrow('mpg123 not found');
  });
});

// ── aplay ─────────────────────────────────────────────────────────────────────

describe('playAudio – aplay', () => {
  beforeEach(() => {
    process.env.AUDIO_PLAYER = 'aplay';
  });

  it('spawns aplay when AUDIO_PLAYER=aplay', async () => {
    vi.mocked(spawn).mockReturnValue(createMockProcess());
    await playAudio('/path/to/audio.wav');
    expect(spawn).toHaveBeenCalledWith('aplay', expect.any(Array), expect.any(Object));
  });

  it('passes only the file path (no volume flags for aplay)', async () => {
    vi.mocked(spawn).mockReturnValue(createMockProcess());
    await playAudio('/path/to/audio.wav');
    const [, args] = vi.mocked(spawn).mock.calls[0];
    expect(args).toEqual(['/path/to/audio.wav']);
  });

  it('resolves when aplay exits with code 0', async () => {
    vi.mocked(spawn).mockReturnValue(createMockProcess({ exitCode: 0 }));
    await expect(playAudio('/path/to/audio.wav')).resolves.toBeUndefined();
  });

  it('rejects when aplay emits an error event', async () => {
    const err = new Error('aplay not found');
    vi.mocked(spawn).mockReturnValue(createMockProcess({ error: err }));
    await expect(playAudio('/path/to/audio.wav')).rejects.toThrow('aplay not found');
  });
});

// ── Player auto-detection ─────────────────────────────────────────────────────

describe('playAudio – player auto-detection', () => {
  it('defaults to mpg123 when AUDIO_PLAYER is not set', async () => {
    delete process.env.AUDIO_PLAYER;
    vi.mocked(spawn).mockReturnValue(createMockProcess());
    await playAudio('/path/to/audio.mp3');
    const [player] = vi.mocked(spawn).mock.calls[0];
    expect(player).toBe('mpg123');
  });
});
