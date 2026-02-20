import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock all external dependencies BEFORE importing index.js
vi.mock('dotenv/config', () => ({}));
vi.mock('../src/poller.js', () => ({ fetchAlerts: vi.fn() }));
vi.mock('../src/tts.js', () => ({ synthesizeSpeech: vi.fn() }));
vi.mock('../src/audioPlayer.js', () => ({ playAudio: vi.fn() }));
vi.mock('../src/deduplication.js', () => ({
  loadSpokenAlerts: vi.fn(),
  hasBeenSpoken: vi.fn(),
  markAsSpoken: vi.fn(),
  _reset: vi.fn(),
}));
vi.mock('../src/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { speak, pollOnce, main, _resetRateLimit } from '../src/index.js';
import { synthesizeSpeech } from '../src/tts.js';
import { playAudio } from '../src/audioPlayer.js';
import { fetchAlerts } from '../src/poller.js';
import { hasBeenSpoken, markAsSpoken, loadSpokenAlerts } from '../src/deduplication.js';

// ── Setup / Teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  _resetRateLimit();

  vi.mocked(synthesizeSpeech).mockResolvedValue('/data/speech.mp3');
  vi.mocked(playAudio).mockResolvedValue();
  vi.mocked(fetchAlerts).mockResolvedValue([]);
  vi.mocked(hasBeenSpoken).mockReturnValue(false);
  vi.mocked(loadSpokenAlerts).mockImplementation(() => {});
  vi.mocked(markAsSpoken).mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ── speak() – rate limiting ───────────────────────────────────────────────────

describe('speak() – rate limiting', () => {
  it('calls synthesizeSpeech and playAudio on the first invocation', async () => {
    await speak('Test message');
    expect(synthesizeSpeech).toHaveBeenCalledOnce();
    expect(playAudio).toHaveBeenCalledWith('/data/speech.mp3');
  });

  it('suppresses speech if called again within the rate limit window', async () => {
    await speak('First message');
    await speak('Second message'); // within the 60-second window
    expect(synthesizeSpeech).toHaveBeenCalledTimes(1);
  });

  it('allows speech again after the rate limit window expires', async () => {
    await speak('First message');
    vi.advanceTimersByTime(61_000); // 61 seconds later
    await speak('Second message');
    expect(synthesizeSpeech).toHaveBeenCalledTimes(2);
  });

  it('does not throw when synthesizeSpeech rejects', async () => {
    vi.mocked(synthesizeSpeech).mockRejectedValue(new Error('TTS failure'));
    await expect(speak('hello')).resolves.toBeUndefined();
  });

  it('does not throw when playAudio rejects', async () => {
    vi.mocked(playAudio).mockRejectedValue(new Error('audio failure'));
    await expect(speak('hello')).resolves.toBeUndefined();
  });
});

// ── pollOnce() ────────────────────────────────────────────────────────────────

describe('pollOnce() – polling cycle', () => {
  it('calls fetchAlerts with the configured state', async () => {
    process.env.ALERT_STATE = 'OH';
    await pollOnce();
    expect(fetchAlerts).toHaveBeenCalledWith('OH');
    delete process.env.ALERT_STATE;
  });

  it('does not speak when there are no active alerts', async () => {
    vi.mocked(fetchAlerts).mockResolvedValue([]);
    await pollOnce();
    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it('speaks a new Tornado Warning alert that has not been spoken', async () => {
    vi.mocked(fetchAlerts).mockResolvedValue([
      {
        id: 'urn:test:new',
        properties: {
          event: 'Tornado Warning',
          areaDesc: 'Jefferson County, KY',
          expires: '2026-05-15T20:00:00Z',
          headline: 'Tornado Warning issued',
        },
      },
    ]);
    vi.mocked(hasBeenSpoken).mockReturnValue(false);

    await pollOnce();

    expect(synthesizeSpeech).toHaveBeenCalledOnce();
    expect(markAsSpoken).toHaveBeenCalledWith('urn:test:new');
  });

  it('does not re-speak a Tornado Warning that has already been spoken', async () => {
    vi.mocked(fetchAlerts).mockResolvedValue([
      {
        id: 'urn:test:duplicate',
        properties: {
          event: 'Tornado Warning',
          areaDesc: 'Jefferson County, KY',
          expires: '2026-05-15T20:00:00Z',
          headline: 'Tornado Warning issued',
        },
      },
    ]);
    vi.mocked(hasBeenSpoken).mockReturnValue(true); // already spoken!

    await pollOnce();

    expect(synthesizeSpeech).not.toHaveBeenCalled();
    expect(markAsSpoken).not.toHaveBeenCalled();
  });

  it('filters out non-Tornado Warning events (does not speak them)', async () => {
    vi.mocked(fetchAlerts).mockResolvedValue([
      {
        id: 'urn:test:watch',
        properties: {
          event: 'Tornado Watch',
          areaDesc: 'Jefferson County, KY',
          expires: '2026-05-15T20:00:00Z',
          headline: 'Tornado Watch issued',
        },
      },
    ]);
    vi.mocked(hasBeenSpoken).mockReturnValue(false);

    await pollOnce();

    expect(synthesizeSpeech).not.toHaveBeenCalled();
  });

  it('marks each new alert as spoken after announcing it', async () => {
    vi.mocked(fetchAlerts).mockResolvedValue([
      {
        id: 'urn:test:a',
        properties: {
          event: 'Tornado Warning',
          areaDesc: 'County A',
          expires: '2026-05-15T20:00:00Z',
          headline: 'Warning A',
        },
      },
      {
        id: 'urn:test:b',
        properties: {
          event: 'Tornado Warning',
          areaDesc: 'County B',
          expires: '2026-05-15T20:00:00Z',
          headline: 'Warning B',
        },
      },
    ]);
    vi.mocked(hasBeenSpoken).mockReturnValue(false);
    // Reset rate limit between the two speaks
    vi.advanceTimersByTime(61_000);

    await pollOnce();

    expect(markAsSpoken).toHaveBeenCalledWith('urn:test:a');
    expect(markAsSpoken).toHaveBeenCalledWith('urn:test:b');
  });
});

// ── main() – startup ──────────────────────────────────────────────────────────

describe('main() – startup', () => {
  it('loads spoken alerts on startup', async () => {
    vi.mocked(fetchAlerts).mockResolvedValue([]);
    await main();
    expect(loadSpokenAlerts).toHaveBeenCalledOnce();
  });

  it('speaks the startup test message on boot', async () => {
    vi.mocked(fetchAlerts).mockResolvedValue([]);
    await main();
    expect(synthesizeSpeech).toHaveBeenCalledOnce();
    const [text] = vi.mocked(synthesizeSpeech).mock.calls[0];
    expect(text).toMatch(/testing|calm/i);
  });

  it('registers SIGTERM and SIGINT signal handlers', async () => {
    const onSpy = vi.spyOn(process, 'on');
    vi.mocked(fetchAlerts).mockResolvedValue([]);
    await main();
    const events = onSpy.mock.calls.map(([evt]) => evt);
    expect(events).toContain('SIGTERM');
    expect(events).toContain('SIGINT');
    onSpy.mockRestore();
  });
});

// ── Shutdown ──────────────────────────────────────────────────────────────────

describe('shutdown', () => {
  it('process.exit is called on SIGTERM', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.mocked(fetchAlerts).mockResolvedValue([]);

    await main();
    process.emit('SIGTERM');

    // Allow async shutdown to complete
    await vi.runAllTimersAsync();

    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('process.exit is called on SIGINT', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.mocked(fetchAlerts).mockResolvedValue([]);

    await main();
    process.emit('SIGINT');

    await vi.runAllTimersAsync();

    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });
});
