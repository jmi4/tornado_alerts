import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchAlerts } from '../src/poller.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const noDelay = () => Promise.resolve();

function makeSuccessResponse(features = []) {
  return {
    ok: true,
    json: () => Promise.resolve({ features }),
  };
}

function makeErrorResponse(status = 500) {
  return {
    ok: false,
    status,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── URL construction ─────────────────────────────────────────────────────────

describe('fetchAlerts – URL construction', () => {
  it('includes the correct NWS base URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeSuccessResponse());
    await fetchAlerts('KY', 0, noDelay);
    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toContain('api.weather.gov/alerts/active');
  });

  it('includes the state code as the "area" query parameter', async () => {
    vi.mocked(fetch).mockResolvedValue(makeSuccessResponse());
    await fetchAlerts('KY', 0, noDelay);
    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toContain('area=KY');
  });

  it('uppercases the state code in the URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeSuccessResponse());
    await fetchAlerts('ky', 0, noDelay);
    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toContain('area=KY');
    expect(url).not.toContain('area=ky');
  });

  it('includes event=Tornado+Warning (or %20) in the URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeSuccessResponse());
    await fetchAlerts('KY', 0, noDelay);
    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toMatch(/event=Tornado[+%20]Warning/);
  });

  it('includes status=actual in the URL', async () => {
    vi.mocked(fetch).mockResolvedValue(makeSuccessResponse());
    await fetchAlerts('KY', 0, noDelay);
    const url = vi.mocked(fetch).mock.calls[0][0];
    expect(url).toContain('status=actual');
  });

  it('sends the correct Accept header', async () => {
    vi.mocked(fetch).mockResolvedValue(makeSuccessResponse());
    await fetchAlerts('KY', 0, noDelay);
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts.headers['Accept']).toBe('application/geo+json');
  });

  it('sends a User-Agent header identifying the app', async () => {
    vi.mocked(fetch).mockResolvedValue(makeSuccessResponse());
    await fetchAlerts('KY', 0, noDelay);
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    expect(opts.headers['User-Agent']).toMatch(/calm-tornado-alert/);
  });
});

// ── Successful responses ──────────────────────────────────────────────────────

describe('fetchAlerts – successful responses', () => {
  it('returns the features array from the NWS response', async () => {
    const features = [{ id: 'urn:test:1', properties: { event: 'Tornado Warning' } }];
    vi.mocked(fetch).mockResolvedValue(makeSuccessResponse(features));
    const result = await fetchAlerts('KY', 0, noDelay);
    expect(result).toEqual(features);
  });

  it('returns an empty array when the API returns no features', async () => {
    vi.mocked(fetch).mockResolvedValue(makeSuccessResponse([]));
    const result = await fetchAlerts('KY', 0, noDelay);
    expect(result).toEqual([]);
  });

  it('handles a missing features key (returns empty array)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}), // no "features" key
    });
    const result = await fetchAlerts('KY', 0, noDelay);
    expect(result).toEqual([]);
  });
});

// ── Retry logic ───────────────────────────────────────────────────────────────

describe('fetchAlerts – retry on failure', () => {
  it('retries after a network error and returns features on second attempt', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(makeSuccessResponse([{ id: 'urn:test:1' }]));

    const result = await fetchAlerts('KY', 0, noDelay);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(1);
  });

  it('retries up to 5 times before giving up', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Persistent failure'));
    await fetchAlerts('KY', 0, noDelay);
    // 1 initial + 5 retries = 6 calls total (MAX_RETRIES = 5)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(6);
  });

  it('returns an empty array after all retries are exhausted', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Always fails'));
    const result = await fetchAlerts('KY', 0, noDelay);
    expect(result).toEqual([]);
  });

  it('succeeds on the 5th retry (last allowed attempt)', async () => {
    const features = [{ id: 'urn:test:5' }];
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockRejectedValueOnce(new Error('fail 4'))
      .mockRejectedValueOnce(new Error('fail 5'))
      .mockResolvedValueOnce(makeSuccessResponse(features));

    const result = await fetchAlerts('KY', 0, noDelay);
    expect(result).toEqual(features);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(6);
  });

  it('retries on HTTP error responses (non-2xx)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeErrorResponse(503))
      .mockResolvedValueOnce(makeSuccessResponse([]));

    await fetchAlerts('KY', 0, noDelay);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
  });
});

// ── Exponential backoff ───────────────────────────────────────────────────────

describe('fetchAlerts – exponential backoff calculation', () => {
  it('uses exponential backoff delays: 5s, 10s, 20s, 40s, 80s for retries 0–4', async () => {
    const delays = [];
    const trackDelay = (ms) => {
      delays.push(ms);
      return Promise.resolve();
    };

    vi.mocked(fetch).mockRejectedValue(new Error('always fails'));

    await fetchAlerts('KY', 0, trackDelay);

    expect(delays).toEqual([5000, 10000, 20000, 40000, 80000]);
  });

  it('base delay is 5 seconds for the first retry', async () => {
    const delays = [];
    const trackDelay = (ms) => {
      delays.push(ms);
      return Promise.resolve();
    };
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(makeSuccessResponse([]));

    await fetchAlerts('KY', 0, trackDelay);
    expect(delays[0]).toBe(5000);
  });

  it('doubles the delay on each successive retry', async () => {
    const delays = [];
    const trackDelay = (ms) => {
      delays.push(ms);
      return Promise.resolve();
    };
    vi.mocked(fetch).mockRejectedValue(new Error('fail'));

    await fetchAlerts('KY', 0, trackDelay);

    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBe(delays[i - 1] * 2);
    }
  });
});
